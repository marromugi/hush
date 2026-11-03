//! A small web server on this machine that serves the page a YouTube video is
//! shown in. YouTube refuses to play inside a page it cannot name (error 153),
//! and the app's own page, under `tauri://`, sends it no name. A page served
//! from `http://127.0.0.1` does. The server serves that page and nothing else,
//! so whatever else on the machine reaches it learns nothing from the diary.

use std::io::{self, BufRead, BufReader, Write};
use std::net::{Ipv4Addr, TcpListener, TcpStream};
use std::thread;
use std::time::Duration;

use crate::app_error::AppError;
use crate::app_state::AppState;

/// Where a video's page is served: `/youtube/{id}`.
const YOUTUBE_PATH: &str = "/youtube/";

/// The length of a YouTube video id.
const YOUTUBE_ID_LEN: usize = 11;

/// How long a connection may take to send its request before it is dropped,
/// so one that never finishes does not hold up the next.
const READ_TIMEOUT: Duration = Duration::from_secs(5);

/// Header lines read from one request at most; the rest are not waited for.
const MAX_HEADER_LINES: usize = 100;

/// Starts serving on a free port of `127.0.0.1` and returns the origin the
/// pages are served under, as `http://127.0.0.1:{port}`.
pub fn start() -> io::Result<String> {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))?;
    let origin = format!("http://{}", listener.local_addr()?);
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            // A connection that fails only fails that one page.
            let _ = serve(stream);
        }
    });
    Ok(origin)
}

/// The origin the pages are served under, as `start` returned it.
pub fn origin(state: &AppState) -> Result<String, AppError> {
    let inner = state
        .lock()
        .expect("state lock is only poisoned by an earlier panic");
    inner.embed_pages.clone().ok_or(AppError::EmbedPages)
}

fn serve(stream: TcpStream) -> io::Result<()> {
    stream.set_read_timeout(Some(READ_TIMEOUT))?;
    let mut reader = BufReader::new(&stream);
    let mut request_line = String::new();
    reader.read_line(&mut request_line)?;
    // Read the headers through, so closing does not reset the connection under the response.
    let mut line = String::new();
    for _ in 0..MAX_HEADER_LINES {
        line.clear();
        if reader.read_line(&mut line)? == 0 || line == "\r\n" || line == "\n" {
            break;
        }
    }
    (&stream).write_all(&response(&request_line))?;
    (&stream).flush()
}

/// The whole HTTP response to a request that starts with `request_line`.
fn response(request_line: &str) -> Vec<u8> {
    let page = match request_line.split(' ').collect::<Vec<_>>()[..] {
        ["GET", path, _] => path.strip_prefix(YOUTUBE_PATH).and_then(youtube_page),
        _ => None,
    };
    let (status, body) = match page {
        Some(body) => ("200 OK", body),
        None => ("404 Not Found", String::new()),
    };
    format!(
        "HTTP/1.1 {status}\r\n\
         Content-Type: text/html; charset=utf-8\r\n\
         Content-Length: {}\r\n\
         Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; frame-src https://www.youtube-nocookie.com\r\n\
         Referrer-Policy: strict-origin-when-cross-origin\r\n\
         X-Content-Type-Options: nosniff\r\n\
         Cache-Control: no-store\r\n\
         Connection: close\r\n\
         \r\n\
         {body}",
        body.len()
    )
    .into_bytes()
}

/// The page that shows the video `id`, filling the frame it is put in.
/// `None` when `id` is not a YouTube video id.
fn youtube_page(id: &str) -> Option<String> {
    let valid = id.len() == YOUTUBE_ID_LEN
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_');
    valid.then(|| {
        format!(
            "<!doctype html><html><head><meta charset=\"utf-8\"><title>YouTube</title>\
             <style>html,body{{margin:0;height:100%;overflow:hidden;background:#000}}\
             iframe{{display:block;width:100%;height:100%;border:0}}</style></head>\
             <body><iframe src=\"https://www.youtube-nocookie.com/embed/{id}\" title=\"YouTube\" \
             allow=\"autoplay; encrypted-media; picture-in-picture; fullscreen\" allowfullscreen \
             referrerpolicy=\"strict-origin-when-cross-origin\"></iframe></body></html>"
        )
    })
}

#[cfg(test)]
mod tests {
    use std::io::Read;

    use super::*;

    fn text(request_line: &str) -> String {
        String::from_utf8(response(request_line)).unwrap()
    }

    #[test]
    fn a_video_id_gets_the_page_that_embeds_it() {
        let response = text("GET /youtube/dQw4w9WgXcQ HTTP/1.1\r\n");
        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(
            response.contains("<iframe src=\"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ\"")
        );
    }

    #[test]
    fn the_length_told_is_the_length_of_the_page() {
        let response = text("GET /youtube/dQw4w9WgXcQ HTTP/1.1\r\n");
        let (head, body) = response.split_once("\r\n\r\n").unwrap();
        assert!(head.contains(&format!("Content-Length: {}\r\n", body.len())));
    }

    #[test]
    fn anything_but_a_video_id_gets_nothing() {
        for request_line in [
            "GET /youtube/dQw4w9WgXc HTTP/1.1\r\n",
            "GET /youtube/dQw4w9WgXcQQ HTTP/1.1\r\n",
            "GET /youtube/dQw4w9WgX%22 HTTP/1.1\r\n",
            "GET /youtube/\"><script>x HTTP/1.1\r\n",
            "GET /youtube/dQw4w9WgXcQ?x=1 HTTP/1.1\r\n",
            "GET / HTTP/1.1\r\n",
            "GET /entries/2026-10-29 HTTP/1.1\r\n",
            "POST /youtube/dQw4w9WgXcQ HTTP/1.1\r\n",
            "",
        ] {
            let response = text(request_line);
            assert!(
                response.starts_with("HTTP/1.1 404 Not Found\r\n"),
                "{request_line:?}"
            );
            assert!(response.ends_with("\r\n\r\n"), "{request_line:?}");
        }
    }

    #[test]
    fn the_server_answers_on_the_loopback_address() {
        let origin = start().unwrap();
        let address = origin.strip_prefix("http://").unwrap();
        assert!(address.starts_with("127.0.0.1:"));
        let mut stream = TcpStream::connect(address).unwrap();
        stream
            .write_all(b"GET /youtube/dQw4w9WgXcQ HTTP/1.1\r\nHost: x\r\nAccept: */*\r\n\r\n")
            .unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).unwrap();
        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(response.contains("youtube-nocookie.com/embed/dQw4w9WgXcQ"));
    }
}
