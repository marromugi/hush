//! A small web server on this machine that serves the page a YouTube video is
//! shown in. YouTube refuses to play inside a page it cannot name (error 153),
//! and the app's own page, under `tauri://`, sends it no name. A page served
//! from `http://127.0.0.1` does. The server serves that page and nothing else,
//! so whatever else on the machine reaches it learns nothing from the diary.

use std::io::{self, Read, Write};
use std::net::{Ipv4Addr, TcpListener, TcpStream};
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::thread;
use std::time::{Duration, Instant};

use crate::app_state::AppState;
use crate::core_error::CoreError;

/// Where a video's page is served: `/youtube/{id}`.
const YOUTUBE_PATH: &str = "/youtube/";

/// The length of a YouTube video id.
const YOUTUBE_ID_LEN: usize = 11;

/// How long a connection may take to send its whole request before it is dropped.
const REQUEST_DEADLINE: Duration = if cfg!(test) {
    Duration::from_secs(1)
} else {
    Duration::from_secs(5)
};

/// The most a request may send before its headers end; past it the connection is dropped.
const MAX_REQUEST_BYTES: usize = 8 * 1024;

/// Connections served at once at most; past it a new one is dropped, so a
/// flood of them cannot use up the machine's threads.
const MAX_CONNECTIONS: usize = 16;

/// How long to wait before accepting again after accepting failed, as when
/// the app has run out of file descriptors and would fail again at once.
const ACCEPT_RETRY: Duration = Duration::from_millis(100);

/// Starts serving on a free port of `127.0.0.1` and returns the origin the
/// pages are served under, as `http://127.0.0.1:{port}`. Each connection is
/// served on its own thread, so one that stalls holds up no other.
pub fn start() -> io::Result<String> {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))?;
    let origin = format!("http://{}", listener.local_addr()?);
    let open = Arc::new(AtomicUsize::new(0));
    thread::spawn(move || {
        loop {
            let stream = match listener.accept() {
                Ok((stream, _)) => stream,
                Err(_) => {
                    thread::sleep(ACCEPT_RETRY);
                    continue;
                }
            };
            if open.fetch_add(1, Ordering::SeqCst) >= MAX_CONNECTIONS {
                open.fetch_sub(1, Ordering::SeqCst);
                continue;
            }
            let open = Arc::clone(&open);
            thread::spawn(move || {
                // A connection that fails only fails that one page.
                let _ = serve(stream);
                open.fetch_sub(1, Ordering::SeqCst);
            });
        }
    });
    Ok(origin)
}

/// The origin the pages are served under, as `start` returned it.
pub fn origin(state: &AppState) -> Result<String, CoreError> {
    let inner = state
        .lock()
        .expect("state lock is only poisoned by an earlier panic");
    inner.embed_pages.clone().ok_or(CoreError::EmbedPages)
}

fn serve(mut stream: TcpStream) -> io::Result<()> {
    let head = read_head(&mut stream)?;
    let head = String::from_utf8_lossy(&head);
    let request_line = head.split("\r\n").next().unwrap_or_default();
    stream.write_all(&response(request_line))?;
    stream.flush()
}

/// Reads the request up to the blank line that ends its headers. Reading
/// them through keeps closing from resetting the connection under the
/// response. A request that does not end within `REQUEST_DEADLINE` and
/// `MAX_REQUEST_BYTES` is an error.
fn read_head(stream: &mut TcpStream) -> io::Result<Vec<u8>> {
    let deadline = Instant::now() + REQUEST_DEADLINE;
    let mut head = Vec::new();
    let mut chunk = [0; 1024];
    while !head.windows(4).any(|window| window == b"\r\n\r\n") {
        let left = deadline.saturating_duration_since(Instant::now());
        if left.is_zero() {
            return Err(io::ErrorKind::TimedOut.into());
        }
        if head.len() >= MAX_REQUEST_BYTES {
            return Err(io::ErrorKind::InvalidData.into());
        }
        stream.set_read_timeout(Some(left))?;
        let read = stream.read(&mut chunk)?;
        if read == 0 {
            break;
        }
        head.extend_from_slice(&chunk[..read]);
    }
    Ok(head)
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

    fn get(address: &str) -> String {
        let mut stream = TcpStream::connect(address).unwrap();
        stream
            .write_all(b"GET /youtube/dQw4w9WgXcQ HTTP/1.1\r\nHost: x\r\n\r\n")
            .unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).unwrap();
        response
    }

    fn address(origin: &str) -> &str {
        origin.strip_prefix("http://").unwrap()
    }

    #[test]
    fn a_stalled_connection_holds_up_no_other() {
        let origin = start().unwrap();
        let _stalled = TcpStream::connect(address(&origin)).unwrap();
        let started = Instant::now();
        assert!(get(address(&origin)).starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(started.elapsed() < REQUEST_DEADLINE);
    }

    #[test]
    fn a_request_that_trickles_past_the_deadline_is_dropped() {
        let origin = start().unwrap();
        let mut stream = TcpStream::connect(address(&origin)).unwrap();
        let started = Instant::now();
        // One byte at a time, each well within the deadline, never ending the headers.
        // Once the server drops the connection, writing to it fails.
        let mut dropped = false;
        while !dropped && started.elapsed() < REQUEST_DEADLINE * 3 {
            dropped = stream.write_all(b"G").is_err();
            thread::sleep(REQUEST_DEADLINE / 10);
        }
        assert!(dropped);
    }

    #[test]
    fn a_request_past_the_size_limit_is_dropped() {
        let origin = start().unwrap();
        let mut stream = TcpStream::connect(address(&origin)).unwrap();
        let _ = stream.write_all(&vec![b'G'; MAX_REQUEST_BYTES * 2]);
        stream.set_read_timeout(Some(REQUEST_DEADLINE)).unwrap();
        let started = Instant::now();
        let mut response = Vec::new();
        let _ = stream.read_to_end(&mut response);
        assert!(response.is_empty());
        assert!(started.elapsed() < REQUEST_DEADLINE);
    }

    #[test]
    fn the_server_answers_on_the_loopback_address() {
        let origin = start().unwrap();
        assert!(address(&origin).starts_with("127.0.0.1:"));
        let response = get(address(&origin));
        assert!(response.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(response.contains("youtube-nocookie.com/embed/dQw4w9WgXcQ"));
    }
}
