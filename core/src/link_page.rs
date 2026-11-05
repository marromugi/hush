use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::time::Duration;

use encoding_rs::{Encoding, UTF_8};
use reqwest::Url;
use reqwest::header::CONTENT_TYPE;
use reqwest::redirect::Policy;
use serde::Serialize;

use crate::core_error::CoreError;

/// How long one request may take, from connecting to the last byte.
const REQUEST_DEADLINE: Duration = Duration::from_secs(10);

/// How much of a page is read. The tags a card needs sit in `<head>`, near
/// the start; a page cut off here is read as far as it goes.
const MAX_PAGE_BYTES: usize = 1024 * 1024;

/// The largest picture taken for a card. A larger one is refused, not cut.
const MAX_IMAGE_BYTES: usize = 10 * 1024 * 1024;

/// Sent as the client's name. Some sites answer only clients that name themselves.
const USER_AGENT: &str = "Mozilla/5.0 (compatible; Hush)";

/// What a card shows of the page a link points at.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkPage {
    /// The page's `og:title`, or its `<title>`. `None` when it has neither.
    pub title: Option<String>,
    /// Where the page's `og:image` is, as an absolute `http` or `https` URL.
    pub image_url: Option<String>,
}

/// Reads the page at `url` for its title and picture.
pub async fn fetch_page(url: &str) -> Result<LinkPage, CoreError> {
    let url = web_url(url)?;
    let response = client()?.get(url).send().await?.error_for_status()?;
    let base = response.url().clone();
    let header_charset = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(charset_of);
    let (bytes, _) = read_body(response, MAX_PAGE_BYTES).await?;
    let html = decode(&bytes, header_charset.as_deref());
    Ok(read_page(&html, &base))
}

/// The picture at `url`, as the site sent it. Fails when it is larger than
/// 10 MB, or when it, or a redirect on the way, is on this machine or its
/// local network: the page chose the address, not the person.
pub async fn fetch_image(url: &str) -> Result<Vec<u8>, CoreError> {
    let url = web_url(url)?;
    if is_inside(&url) {
        return Err(CoreError::UnreadableLink);
    }
    let response = image_client()?.get(url).send().await?.error_for_status()?;
    // A redirect stopped above leaves its 3xx answer, which is no picture.
    if response.status().is_redirection() {
        return Err(CoreError::UnreadableLink);
    }
    let (bytes, whole) = read_body(response, MAX_IMAGE_BYTES).await?;
    if !whole {
        return Err(CoreError::UnreadableLink);
    }
    Ok(bytes)
}

/// A client that follows no redirect into this machine or its local network.
fn image_client() -> Result<reqwest::Client, CoreError> {
    client_with(Policy::custom(|attempt| {
        if is_inside(attempt.url()) {
            attempt.stop()
        } else {
            Policy::default().redirect(attempt)
        }
    }))
}

fn client() -> Result<reqwest::Client, CoreError> {
    client_with(Policy::default())
}

fn client_with(redirects: Policy) -> Result<reqwest::Client, CoreError> {
    Ok(reqwest::Client::builder()
        .redirect(redirects)
        .timeout(REQUEST_DEADLINE)
        .user_agent(USER_AGENT)
        .build()?)
}

/// `text` as a URL, when it is an `http` or `https` one.
fn web_url(text: &str) -> Result<Url, CoreError> {
    let url = Url::parse(text).map_err(|_| CoreError::UnreadableLink)?;
    if url.scheme() == "http" || url.scheme() == "https" {
        Ok(url)
    } else {
        Err(CoreError::UnreadableLink)
    }
}

/// Whether `url` names this machine or an address on a local network by
/// itself. A name that a DNS server turns into such an address is not caught.
fn is_inside(url: &Url) -> bool {
    let Some(host) = url.host_str() else {
        return true;
    };
    match host.trim_matches(['[', ']']).parse::<IpAddr>() {
        Ok(IpAddr::V4(ip)) => is_inside_v4(ip),
        Ok(IpAddr::V6(ip)) => is_inside_v6(ip),
        Err(_) => {
            let name = host.trim_end_matches('.').to_ascii_lowercase();
            name == "localhost" || name.ends_with(".localhost") || name.ends_with(".local")
        }
    }
}

fn is_inside_v4(ip: Ipv4Addr) -> bool {
    ip.is_loopback()
        || ip.is_private()
        || ip.is_link_local()
        || ip.is_unspecified()
        || ip.is_broadcast()
        // 100.64.0.0/10, shared by a carrier among its customers.
        || (ip.octets()[0] == 100 && ip.octets()[1] & 0xc0 == 64)
}

fn is_inside_v6(ip: Ipv6Addr) -> bool {
    if let Some(v4) = ip.to_ipv4_mapped() {
        return is_inside_v4(v4);
    }
    ip.is_loopback() || ip.is_unspecified() || ip.is_unique_local() || ip.is_unicast_link_local()
}

/// Up to `limit` bytes of the body, and whether that was all of it.
async fn read_body(
    mut response: reqwest::Response,
    limit: usize,
) -> Result<(Vec<u8>, bool), CoreError> {
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await? {
        if bytes.len() + chunk.len() > limit {
            bytes.extend_from_slice(&chunk[..limit - bytes.len()]);
            return Ok((bytes, false));
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok((bytes, true))
}

/// The page's text, in the charset the server named, else the one the page
/// names in a `<meta>` tag, else UTF-8.
fn decode(bytes: &[u8], header_charset: Option<&str>) -> String {
    let encoding = header_charset
        .and_then(|label| Encoding::for_label(label.as_bytes()))
        .or_else(|| {
            // A page names its charset near the start, in ASCII whatever the charset.
            let head = String::from_utf8_lossy(&bytes[..bytes.len().min(4096)]);
            meta_charset(&head).and_then(|label| Encoding::for_label(label.as_bytes()))
        })
        .unwrap_or(UTF_8);
    encoding.decode(bytes).0.into_owned()
}

/// `utf-8` from `text/html; charset=utf-8`.
fn charset_of(content_type: &str) -> Option<String> {
    content_type.split(';').find_map(|part| {
        let (name, value) = part.split_once('=')?;
        name.trim()
            .eq_ignore_ascii_case("charset")
            .then(|| value.trim().trim_matches('"').to_owned())
    })
}

/// The charset in `<meta charset="…">` or `<meta http-equiv="Content-Type" content="…; charset=…">`.
fn meta_charset(html: &str) -> Option<String> {
    tags(html, "meta").find_map(|attributes| {
        if let Some(charset) = attribute(&attributes, "charset") {
            return Some(charset.to_owned());
        }
        let equiv = attribute(&attributes, "http-equiv")?;
        if !equiv.eq_ignore_ascii_case("content-type") {
            return None;
        }
        charset_of(attribute(&attributes, "content")?)
    })
}

/// The title and picture `html` names, with the picture's URL resolved against `base`.
pub fn read_page(html: &str, base: &Url) -> LinkPage {
    let html = &without_hidden(html);
    let mut og_title = None;
    let mut twitter_title = None;
    let mut og_image = None;
    let mut twitter_image = None;
    for attributes in tags(html, "meta") {
        let Some(key) = attribute(&attributes, "property").or(attribute(&attributes, "name"))
        else {
            continue;
        };
        let Some(content) = attribute(&attributes, "content") else {
            continue;
        };
        let slot = match key.to_ascii_lowercase().as_str() {
            "og:title" => &mut og_title,
            "twitter:title" => &mut twitter_title,
            "og:image" | "og:image:url" | "og:image:secure_url" => &mut og_image,
            "twitter:image" | "twitter:image:src" => &mut twitter_image,
            _ => continue,
        };
        if slot.is_none() && !content.trim().is_empty() {
            *slot = Some(content.to_owned());
        }
    }
    let title = [og_title, twitter_title, title_element(html)]
        .into_iter()
        .flatten()
        .map(|text| clean_text(&text))
        .find(|text| !text.is_empty());
    let image_url = [og_image, twitter_image]
        .into_iter()
        .flatten()
        .find_map(|link| {
            let url = base.join(decode_entities(link.trim()).as_str()).ok()?;
            matches!(url.scheme(), "http" | "https").then(|| url.to_string())
        });
    LinkPage { title, image_url }
}

/// Pairs that open and close markup a page does not show: tags written
/// there are not the page's own.
const HIDDEN: [(&str, &str); 3] = [
    ("<!--", "-->"),
    ("<script", "</script"),
    ("<style", "</style"),
];

/// `html` without its comments, scripts, and stylesheets.
fn without_hidden(html: &str) -> String {
    let lower = html.to_ascii_lowercase();
    let mut kept = String::with_capacity(html.len());
    let mut at = 0;
    while let Some((start, close)) = HIDDEN
        .iter()
        .filter_map(|(open, close)| Some((at + lower[at..].find(open)?, *close)))
        .min_by_key(|(start, _)| *start)
    {
        kept.push_str(&html[at..start]);
        at = lower[start..]
            .find(close)
            .map_or(html.len(), |end| start + end + close.len());
    }
    kept.push_str(&html[at..]);
    kept
}

/// The text inside `<title>…</title>`.
fn title_element(html: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();
    let open = lower.find("<title")?;
    let start = open + lower[open..].find('>')? + 1;
    let end = start + lower[start..].find("</title")?;
    Some(html[start..end].to_owned())
}

/// Entities decoded and runs of whitespace made one space.
fn clean_text(text: &str) -> String {
    decode_entities(text)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&nbsp;`, and numeric
/// references decoded. Any other entity is left as it is.
fn decode_entities(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(at) = rest.find('&') {
        out.push_str(&rest[..at]);
        rest = &rest[at..];
        let decoded = rest.find(';').filter(|&end| end <= 10).and_then(|end| {
            let name = &rest[1..end];
            let ch = match name {
                "amp" => Some('&'),
                "lt" => Some('<'),
                "gt" => Some('>'),
                "quot" => Some('"'),
                "apos" => Some('\''),
                "nbsp" => Some(' '),
                _ => {
                    let number = name.strip_prefix('#')?;
                    let code = match number.strip_prefix(['x', 'X']) {
                        Some(hex) => u32::from_str_radix(hex, 16).ok()?,
                        None => number.parse().ok()?,
                    };
                    char::from_u32(code)
                }
            }?;
            Some((ch, end))
        });
        match decoded {
            Some((ch, end)) => {
                out.push(ch);
                rest = &rest[end + 1..];
            }
            None => {
                out.push('&');
                rest = &rest[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

/// The attributes of each `<name …>` tag in `html`, as name and value pairs
/// with names lowercased. Values are as written, entities not decoded.
fn tags<'a>(html: &'a str, name: &'a str) -> impl Iterator<Item = Vec<(String, &'a str)>> + 'a {
    let lower = html.to_ascii_lowercase();
    let open = format!("<{name}");
    let mut starts = Vec::new();
    let mut from = 0;
    while let Some(at) = lower[from..].find(&open) {
        let start = from + at + open.len();
        from = start;
        // `<metadata` is not `<meta`.
        if lower[start..]
            .chars()
            .next()
            .is_some_and(|c| c.is_ascii_whitespace() || c == '/' || c == '>')
        {
            starts.push(start);
        }
    }
    starts
        .into_iter()
        .map(move |start| attributes(&html[start..]))
}

/// The attributes at the start of `text`, up to the `>` that ends the tag.
fn attributes(text: &str) -> Vec<(String, &str)> {
    let mut found = Vec::new();
    let mut rest = text;
    loop {
        rest = rest.trim_start_matches(|c: char| c.is_ascii_whitespace() || c == '/');
        if rest.is_empty() || rest.starts_with('>') {
            return found;
        }
        let name_end = rest
            .find(|c: char| c.is_ascii_whitespace() || c == '=' || c == '>' || c == '/')
            .unwrap_or(rest.len());
        let name = rest[..name_end].to_ascii_lowercase();
        rest = rest[name_end..].trim_start();
        let Some(after_equals) = rest.strip_prefix('=') else {
            found.push((name, ""));
            continue;
        };
        rest = after_equals.trim_start();
        let value;
        if let Some(quote) = rest.chars().next().filter(|&c| c == '"' || c == '\'') {
            let body = &rest[1..];
            let end = body.find(quote).unwrap_or(body.len());
            value = &body[..end];
            rest = body.get(end + 1..).unwrap_or("");
        } else {
            let end = rest
                .find(|c: char| c.is_ascii_whitespace() || c == '>')
                .unwrap_or(rest.len());
            value = &rest[..end];
            rest = &rest[end..];
        }
        found.push((name, value));
    }
}

/// The value of the attribute `name`, when the tag has it.
fn attribute<'a>(attributes: &[(String, &'a str)], name: &str) -> Option<&'a str> {
    attributes
        .iter()
        .find(|(found, _)| found == name)
        .map(|(_, value)| *value)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> Url {
        Url::parse("https://example.com/blog/post").unwrap()
    }

    #[test]
    fn open_graph_tags_give_the_title_and_picture() {
        let html = r#"<html><head>
            <title>Site name</title>
            <meta property="og:title" content="海へ行った日">
            <meta property="og:image" content="https://cdn.example.com/sea.jpg">
        </head></html>"#;
        assert_eq!(
            read_page(html, &base()),
            LinkPage {
                title: Some("海へ行った日".into()),
                image_url: Some("https://cdn.example.com/sea.jpg".into()),
            }
        );
    }

    #[test]
    fn without_open_graph_the_title_element_and_twitter_picture_are_used() {
        let html = r#"<title>
              A   page
            </title><meta name="twitter:image" content="/card.png">"#;
        assert_eq!(
            read_page(html, &base()),
            LinkPage {
                title: Some("A page".into()),
                image_url: Some("https://example.com/card.png".into()),
            }
        );
    }

    #[test]
    fn attributes_in_any_order_case_and_quoting_are_read() {
        let html = "<META CONTENT='Tom &amp; Jerry &#x2014; &#39;ep&#39;' Property=og:title />\
                    <meta content=//cdn.example.com/a.webp property=og:image>";
        let page = read_page(html, &base());
        assert_eq!(page.title.as_deref(), Some("Tom & Jerry — 'ep'"));
        assert_eq!(
            page.image_url.as_deref(),
            Some("https://cdn.example.com/a.webp")
        );
    }

    #[test]
    fn the_first_of_repeated_tags_is_kept() {
        let html = r#"<meta property="og:image" content="https://a.example/1.jpg">
                      <meta property="og:image" content="https://a.example/2.jpg">"#;
        assert_eq!(
            read_page(html, &base()).image_url.as_deref(),
            Some("https://a.example/1.jpg")
        );
    }

    #[test]
    fn a_picture_that_is_not_on_the_web_is_dropped() {
        let html = r#"<meta property="og:image" content="data:image/png;base64,AAAA">"#;
        assert_eq!(read_page(html, &base()).image_url, None);
    }

    #[test]
    fn a_page_with_nothing_gives_nothing() {
        assert_eq!(
            read_page(
                r#"<p>hi</p><metadata property="og:title" content="x">"#,
                &base()
            ),
            LinkPage {
                title: None,
                image_url: None
            }
        );
    }

    #[test]
    fn an_empty_title_falls_back_to_the_next() {
        let html = r#"<meta property="og:title" content="  "><title>Real</title>"#;
        assert_eq!(read_page(html, &base()).title.as_deref(), Some("Real"));
    }

    #[test]
    fn a_page_in_shift_jis_named_in_its_meta_tag_is_decoded() {
        let (bytes, _, _) = encoding_rs::SHIFT_JIS
            .encode(r#"<meta charset="Shift_JIS"><meta property="og:title" content="日記">"#);
        let html = decode(&bytes, None);
        assert_eq!(read_page(&html, &base()).title.as_deref(), Some("日記"));
    }

    #[test]
    fn the_charset_the_server_names_wins_over_the_pages_own() {
        let (bytes, _, _) =
            encoding_rs::EUC_JP.encode(r#"<meta charset="Shift_JIS"><title>日記</title>"#);
        assert_eq!(
            charset_of("text/html; charset=\"EUC-JP\"").as_deref(),
            Some("EUC-JP")
        );
        let html = decode(&bytes, Some("EUC-JP"));
        assert_eq!(read_page(&html, &base()).title.as_deref(), Some("日記"));
    }

    #[test]
    fn a_charset_the_server_names_wrongly_leaves_the_pages_own() {
        let (bytes, _, _) =
            encoding_rs::SHIFT_JIS.encode(r#"<meta charset="Shift_JIS"><title>日記</title>"#);
        let html = decode(&bytes, Some("no-such-charset"));
        assert_eq!(read_page(&html, &base()).title.as_deref(), Some("日記"));
    }

    #[test]
    fn tags_in_comments_and_scripts_are_not_the_pages() {
        let html = r#"<!-- <meta property="og:title" content="old"> -->
            <script>document.write('<meta property="og:image" content="/x.jpg">')</script>
            <meta property="og:title" content="new">
            <meta property="og:image" content="/new.jpg">"#;
        assert_eq!(
            read_page(html, &base()),
            LinkPage {
                title: Some("new".into()),
                image_url: Some("https://example.com/new.jpg".into()),
            }
        );
    }

    #[test]
    fn an_unclosed_comment_hides_the_rest() {
        let html = r#"<meta property="og:title" content="a"><!-- <meta property="og:image" content="/x.jpg">"#;
        assert_eq!(
            read_page(html, &base()),
            LinkPage {
                title: Some("a".into()),
                image_url: None
            }
        );
    }

    #[test]
    fn an_empty_picture_falls_back_to_the_next() {
        let html =
            r#"<meta property="og:image" content=""><meta name="twitter:image" content="/t.png">"#;
        assert_eq!(
            read_page(html, &base()).image_url.as_deref(),
            Some("https://example.com/t.png")
        );
    }

    #[test]
    fn addresses_on_this_machine_or_a_local_network_are_inside() {
        for inside in [
            "http://localhost/a.png",
            "http://LOCALHOST./a.png",
            "http://printer.local/a.png",
            "http://127.0.0.1/a.png",
            "http://10.0.0.1/a.png",
            "http://172.16.5.4/a.png",
            "http://192.168.1.1/a.png",
            "http://169.254.169.254/a.png",
            "http://100.64.0.1/a.png",
            "http://0.0.0.0/a.png",
            "http://[::1]/a.png",
            "http://[fd00::1]/a.png",
            "http://[fe80::1]/a.png",
            "http://[::ffff:192.168.1.1]/a.png",
        ] {
            assert!(is_inside(&Url::parse(inside).unwrap()), "{inside}");
        }
        for outside in [
            "https://example.com/a.png",
            "https://8.8.8.8/a.png",
            "https://100.128.0.1/a.png",
            "https://[2001:db8::1]/a.png",
            "https://local.example.com/a.png",
        ] {
            assert!(!is_inside(&Url::parse(outside).unwrap()), "{outside}");
        }
    }

    /// A server on the loopback address that answers one request with
    /// `answer`, and tells whether a request came.
    fn one_answer(answer: String) -> (u16, std::sync::mpsc::Receiver<()>) {
        use std::io::{Read, Write};
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let (came, heard) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            if let Ok((mut stream, _)) = listener.accept() {
                let _ = came.send(());
                let _ = stream.read(&mut [0; 1024]);
                let _ = stream.write_all(answer.as_bytes());
            }
        });
        (port, heard)
    }

    #[test]
    fn a_picture_is_not_followed_into_the_local_network() {
        let (inside, reached) = one_answer("HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n".into());
        let (start, _) = one_answer(format!(
            "HTTP/1.1 302 Found\r\nLocation: http://127.0.0.1:{inside}/a.png\r\nContent-Length: 0\r\n\r\n"
        ));
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let status = runtime.block_on(async {
            image_client()
                .unwrap()
                .get(format!("http://127.0.0.1:{start}/"))
                .send()
                .await
                .unwrap()
                .status()
        });
        assert_eq!(status, 302);
        assert!(reached.try_recv().is_err());
    }

    #[test]
    fn only_web_links_are_fetched() {
        assert!(web_url("https://example.com").is_ok());
        assert!(web_url("http://example.com").is_ok());
        assert!(matches!(
            web_url("file:///etc/passwd"),
            Err(CoreError::UnreadableLink)
        ));
        assert!(matches!(
            web_url("not a url"),
            Err(CoreError::UnreadableLink)
        ));
    }
}
