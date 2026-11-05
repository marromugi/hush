use std::time::Duration;

use encoding_rs::{Encoding, UTF_8};
use reqwest::Url;
use reqwest::header::CONTENT_TYPE;
use serde::Serialize;

use crate::app_error::AppError;

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
pub async fn fetch_page(url: &str) -> Result<LinkPage, AppError> {
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

/// The picture at `url`, as the site sent it. Fails when it is larger than 10 MB.
pub async fn fetch_image(url: &str) -> Result<Vec<u8>, AppError> {
    let url = web_url(url)?;
    let response = client()?.get(url).send().await?.error_for_status()?;
    let (bytes, whole) = read_body(response, MAX_IMAGE_BYTES).await?;
    if !whole {
        return Err(AppError::UnreadableLink);
    }
    Ok(bytes)
}

fn client() -> Result<reqwest::Client, AppError> {
    Ok(reqwest::Client::builder()
        .timeout(REQUEST_DEADLINE)
        .user_agent(USER_AGENT)
        .build()?)
}

/// `text` as a URL, when it is an `http` or `https` one.
fn web_url(text: &str) -> Result<Url, AppError> {
    let url = Url::parse(text).map_err(|_| AppError::UnreadableLink)?;
    if url.scheme() == "http" || url.scheme() == "https" {
        Ok(url)
    } else {
        Err(AppError::UnreadableLink)
    }
}

/// Up to `limit` bytes of the body, and whether that was all of it.
async fn read_body(
    mut response: reqwest::Response,
    limit: usize,
) -> Result<(Vec<u8>, bool), AppError> {
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
    let named = header_charset.map(str::to_owned).or_else(|| {
        // A page names its charset near the start, in ASCII whatever the charset.
        let head = String::from_utf8_lossy(&bytes[..bytes.len().min(4096)]);
        meta_charset(&head)
    });
    let encoding = named
        .and_then(|label| Encoding::for_label(label.as_bytes()))
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
        if slot.is_none() {
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
            read_page("<p>hi</p><metadata>", &base()),
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
    fn the_charset_the_server_names_wins() {
        let (bytes, _, _) = encoding_rs::EUC_JP.encode("<title>日記</title>");
        assert_eq!(
            charset_of("text/html; charset=\"EUC-JP\"").as_deref(),
            Some("EUC-JP")
        );
        let html = decode(&bytes, Some("EUC-JP"));
        assert_eq!(read_page(&html, &base()).title.as_deref(), Some("日記"));
    }

    #[test]
    fn only_web_links_are_fetched() {
        assert!(web_url("https://example.com").is_ok());
        assert!(web_url("http://example.com").is_ok());
        assert!(matches!(
            web_url("file:///etc/passwd"),
            Err(AppError::UnreadableLink)
        ));
        assert!(matches!(
            web_url("not a url"),
            Err(AppError::UnreadableLink)
        ));
    }
}
