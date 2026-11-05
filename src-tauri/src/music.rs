//! The playlist the diary plays from a corner of its screen, chosen in the
//! settings from the Music app's own. Only Apple's Music app can be asked:
//! on macOS through `osascript`, on iOS through the media library and the
//! system music player. Either needs the person's leave first, asked when
//! the settings list the playlists.

#[cfg(any(target_os = "macos", target_os = "ios", test))]
use base64ct::{Base64, Encoding};
use serde::Serialize;
use tauri::AppHandle;

use crate::app_error::AppError;

/// One of the person's playlists. `id` is the Music app's own, and differs
/// between devices for the same playlist.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Playlist {
    pub id: String,
    pub name: String,
}

/// What the settings can offer.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum Playlists {
    /// This platform has no Music app to ask.
    Unsupported,
    /// The person has not let Hush use the Music app.
    Denied,
    Listed {
        playlists: Vec<Playlist>,
    },
}

/// The size the artwork is kept at, in pixels: three times the 48pt it is
/// shown at, and small enough to keep in the settings.
#[cfg(any(target_os = "macos", target_os = "ios"))]
const ARTWORK_SIDE: u32 = 144;

/// A `data:` URL for an image, typed by its first bytes; None for anything
/// that is not a PNG or a JPEG, which the page could not show.
#[cfg(any(target_os = "macos", target_os = "ios", test))]
fn data_url(bytes: &[u8]) -> Option<String> {
    let mime = if bytes.starts_with(b"\x89PNG") {
        "image/png"
    } else if bytes.starts_with(b"\xFF\xD8") {
        "image/jpeg"
    } else {
        return None;
    };
    Some(format!(
        "data:{mime};base64,{}",
        Base64::encode_string(bytes)
    ))
}

/// The largest artwork read from the Music app, before it is made smaller.
#[cfg(any(target_os = "macos", test))]
const MAX_ARTWORK: usize = 8 * 1024 * 1024;

/// Reads what `osascript -s s` prints for a flat list of names and ids,
/// `{"name", "id", ...}`. Anything else is None.
#[cfg(any(target_os = "macos", test))]
fn parse_playlists(out: &str) -> Option<Vec<Playlist>> {
    let mut rest = out.trim().strip_prefix('{')?.strip_suffix('}')?;
    let mut playlists = Vec::new();
    while !rest.is_empty() {
        let name = take_string(&mut rest)?;
        rest = rest.strip_prefix(", ")?;
        let id = take_string(&mut rest)?;
        rest = rest.strip_prefix(", ").unwrap_or(rest);
        playlists.push(Playlist { id, name });
    }
    Some(playlists)
}

/// Reads what `osascript -s s` prints for raw image data, `«data ...»`.
/// `missing value`, art larger than `MAX_ARTWORK`, and anything else are None.
#[cfg(any(target_os = "macos", test))]
fn parse_data(out: &str) -> Option<Vec<u8>> {
    let data = out.trim().strip_prefix("«data ")?.strip_suffix('»')?;
    // Four letters name the data's type, then the bytes in hex.
    let digits = data.get(4..)?;
    (digits.len() <= MAX_ARTWORK * 2)
        .then(|| hex(digits))
        .flatten()
}

/// Takes a quoted AppleScript string off the front of `rest`, undoing its `\"` and `\\`.
#[cfg(any(target_os = "macos", test))]
fn take_string(rest: &mut &str) -> Option<String> {
    let mut chars = rest.strip_prefix('"')?.char_indices();
    let mut text = String::new();
    while let Some((at, c)) = chars.next() {
        match c {
            '"' => {
                *rest = &rest[at + 2..];
                return Some(text);
            }
            '\\' => text.push(chars.next()?.1),
            c => text.push(c),
        }
    }
    None
}

#[cfg(any(target_os = "macos", test))]
fn hex(text: &str) -> Option<Vec<u8>> {
    if !text.len().is_multiple_of(2) {
        return None;
    }
    (0..text.len())
        .step_by(2)
        .map(|at| u8::from_str_radix(text.get(at..at + 2)?, 16).ok())
        .collect()
}

#[cfg(target_os = "macos")]
mod macos {
    use std::io::Read;
    use std::process::{Command, Stdio};
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::thread;
    use std::time::{Duration, Instant};

    use super::{ARTWORK_SIDE, AppError, Playlists, data_url, parse_data, parse_playlists};

    // Inside `tell`, names the Music app uses itself, such as `song` or
    // `item`, cannot name variables or be used on lists; the id is read
    // before it.

    /// Folders, the library, and the Music app's own lists are left out.
    const LIST: &str = r#"
tell application "Music"
  set out to {}
  repeat with thePlaylist in (every user playlist whose special kind is none)
    set end of out to name of thePlaylist
    set end of out to persistent ID of thePlaylist
  end repeat
  return out
end tell
"#;

    /// The playlist's own artwork, else its first song's.
    const ARTWORK: &str = r#"
on run argv
  set theID to item 1 of argv
  tell application "Music"
    set thePlaylist to first user playlist whose persistent ID is theID
    try
      return raw data of artwork 1 of thePlaylist
    end try
    try
      return raw data of artwork 1 of track 1 of thePlaylist
    end try
  end tell
  return missing value
end run
"#;

    const PLAY: &str = r#"
on run argv
  set theID to item 1 of argv
  tell application "Music"
    set shuffle enabled to true
    play (first user playlist whose persistent ID is theID)
  end tell
end run
"#;

    /// How long the Music app may take to answer, its opening and Hush's
    /// permission prompt included, before the question is dropped.
    const ANSWER_WITHIN: Duration = Duration::from_secs(20);

    /// The person's playlists. The first time, macOS asks whether Hush may
    /// control the Music app, and the Music app opens if it is closed.
    pub fn playlists() -> Playlists {
        match run(LIST, &[], ANSWER_WITHIN).and_then(|out| parse_playlists(&out)) {
            Some(playlists) => Playlists::Listed { playlists },
            // Not allowed, or not answered in time: either way the person is told to allow it.
            None => Playlists::Denied,
        }
    }

    pub fn artwork(id: &str) -> Option<String> {
        let bytes = parse_data(&run(ARTWORK, &[id], ANSWER_WITHIN)?)?;
        data_url(&thumbnail(&bytes)?)
    }

    /// Plays the playlist shuffled, from a song the Music app picks.
    pub fn play(id: &str) -> Result<(), AppError> {
        run(PLAY, &[id], ANSWER_WITHIN)
            .map(|_| ())
            .ok_or(AppError::Music)
    }

    /// `bytes` as a JPEG no wider or taller than `ARTWORK_SIDE`, made by `sips`,
    /// which comes with macOS.
    pub(super) fn thumbnail(bytes: &[u8]) -> Option<Vec<u8>> {
        static NEXT: AtomicU32 = AtomicU32::new(0);
        let name = format!(
            "hush-artwork-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        );
        let source = std::env::temp_dir().join(&name);
        let target = std::env::temp_dir().join(format!("{name}.jpg"));
        let made = std::fs::write(&source, bytes).ok().and_then(|()| {
            let side = ARTWORK_SIDE.to_string();
            let status = Command::new("sips")
                .args([
                    "-s",
                    "format",
                    "jpeg",
                    "-s",
                    "formatOptions",
                    "80",
                    "-Z",
                    &side,
                ])
                .arg(&source)
                .arg("--out")
                .arg(&target)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .ok()?;
            status
                .success()
                .then(|| std::fs::read(&target).ok())
                .flatten()
        });
        let _ = std::fs::remove_file(&source);
        let _ = std::fs::remove_file(&target);
        made
    }

    /// What `osascript` prints for `script` run with `args`; None when it
    /// fails or takes longer than `limit`.
    fn run(script: &str, args: &[&str], limit: Duration) -> Option<String> {
        let mut child = Command::new("osascript")
            .args(["-s", "s", "-e", script])
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .ok()?;
        // Read while it runs: artwork can be more than the pipe holds, and
        // it would wait for room forever.
        let mut stdout = child.stdout.take()?;
        let reader = thread::spawn(move || {
            let mut out = String::new();
            stdout.read_to_string(&mut out).ok().map(|_| out)
        });
        let deadline = Instant::now() + limit;
        loop {
            match child.try_wait() {
                Ok(Some(status)) if status.success() => return reader.join().ok()?,
                Ok(Some(_)) => return None,
                Ok(None) if Instant::now() < deadline => thread::sleep(Duration::from_millis(50)),
                _ => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return None;
                }
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn the_questions_to_the_music_app_compile() {
            // Compiling reads the Music app's dictionary without opening it.
            for script in [LIST, ARTWORK, PLAY] {
                let compiled =
                    std::env::temp_dir().join(format!("hush-music-{}.scpt", std::process::id()));
                let status = Command::new("osacompile")
                    .arg("-o")
                    .arg(&compiled)
                    .args(["-e", script])
                    .stderr(Stdio::null())
                    .status()
                    .unwrap();
                let _ = std::fs::remove_file(&compiled);
                assert!(status.success(), "{script}");
            }
        }

        #[test]
        fn the_id_reaches_the_script_as_it_is() {
            let out = run(
                "on run argv\nreturn item 1 of argv\nend run",
                &["\" & quit & \""],
                ANSWER_WITHIN,
            );
            assert_eq!(out.as_deref().map(str::trim), Some(r#""\" & quit & \"""#));
        }

        #[test]
        fn a_long_answer_is_read_whole() {
            let out = run(
                r#"return text 1 thru 300000 of (do shell script "head -c 300000 /dev/zero | tr '\\0' x")"#,
                &[],
                ANSWER_WITHIN,
            );
            assert_eq!(out.map(|out| out.trim().len()), Some(300_002));
        }

        #[test]
        fn an_answer_that_takes_too_long_is_dropped() {
            let started = Instant::now();
            assert_eq!(run("delay 5", &[], Duration::from_millis(300)), None);
            assert!(started.elapsed() < Duration::from_secs(2));
        }

        #[test]
        fn artwork_is_made_a_small_jpeg() {
            // A 400×200 PNG, drawn by sips itself from a blank one.
            let png = std::env::temp_dir().join(format!("hush-test-{}.png", std::process::id()));
            let made = Command::new("sips")
                .args(["-s", "format", "png", "-z", "200", "400"])
                .arg("/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns")
                .arg("--out")
                .arg(&png)
                .stdout(Stdio::null())
                .status()
                .unwrap();
            assert!(made.success());
            let bytes = std::fs::read(&png).unwrap();
            let _ = std::fs::remove_file(&png);

            let jpeg = thumbnail(&bytes).unwrap();
            assert!(jpeg.starts_with(b"\xFF\xD8"));
            assert!(jpeg.len() < bytes.len());
        }

        #[test]
        fn what_is_not_an_image_has_no_thumbnail() {
            assert_eq!(thumbnail(b"not an image"), None);
        }
    }
}

#[cfg(target_os = "ios")]
mod ios {
    use std::sync::mpsc;
    use std::time::Duration;

    use block2::RcBlock;
    use objc2::msg_send;
    use objc2::rc::Retained;
    use objc2::runtime::AnyObject;
    use objc2_core_foundation::CGSize;
    use objc2_foundation::NSNumber;
    use objc2_media_player::{
        MPMediaLibrary, MPMediaLibraryAuthorizationStatus, MPMediaPlayback, MPMediaPlaylist,
        MPMediaPlaylistPropertyPersistentID, MPMediaPropertyPredicate, MPMediaQuery,
        MPMusicPlayerController, MPMusicShuffleMode,
    };
    use objc2_ui_kit::UIImage;
    use tauri::AppHandle;

    use super::{ARTWORK_SIDE, AppError, Playlist, Playlists, data_url};

    /// How long the person may take to answer iOS's question before the
    /// settings say Hush is not allowed.
    const ASK_WITHIN: Duration = Duration::from_secs(120);

    /// How long the main thread may take to start the player.
    const PLAY_WITHIN: Duration = Duration::from_secs(10);

    /// Whether Hush may use the media library. The first time, iOS asks the
    /// person, and this waits for their answer.
    fn allowed() -> bool {
        // SAFETY: plain class methods of MPMediaLibrary.
        match unsafe { MPMediaLibrary::authorizationStatus() } {
            MPMediaLibraryAuthorizationStatus::Authorized => true,
            MPMediaLibraryAuthorizationStatus::NotDetermined => {
                let (answer, answered) = mpsc::channel();
                let block = RcBlock::new(move |status: MPMediaLibraryAuthorizationStatus| {
                    let _ = answer.send(status == MPMediaLibraryAuthorizationStatus::Authorized);
                });
                // SAFETY: the block takes the status, as the method expects, and
                // the method copies it.
                unsafe { MPMediaLibrary::requestAuthorization(&block) };
                answered.recv_timeout(ASK_WITHIN).unwrap_or(false)
            }
            _ => false,
        }
    }

    /// The playlists in the media library, Apple Music ones added to it included.
    pub fn playlists() -> Playlists {
        if !allowed() {
            return Playlists::Denied;
        }
        // SAFETY: the query and its playlists are only read, and every getter
        // here takes no arguments.
        let playlists = unsafe { MPMediaQuery::playlistsQuery().collections() }
            .map(|found| found.to_vec())
            .unwrap_or_default()
            .into_iter()
            .filter_map(|collection| Retained::downcast::<MPMediaPlaylist>(collection).ok())
            .map(|playlist| unsafe {
                Playlist {
                    id: playlist.persistentID().to_string(),
                    name: playlist
                        .name()
                        .map(|name| name.to_string())
                        .unwrap_or_default(),
                }
            })
            .collect();
        Playlists::Listed { playlists }
    }

    /// The query for the playlist `id`; None when `id` is not one of iOS's.
    fn query_for(id: &str) -> Option<Retained<MPMediaQuery>> {
        let id: u64 = id.parse().ok()?;
        let value = NSNumber::new_u64(id);
        let value: &AnyObject = &value;
        // SAFETY: a playlist's persistent ID is compared with an NSNumber, as Apple documents.
        unsafe {
            let query = MPMediaQuery::playlistsQuery();
            let predicate = MPMediaPropertyPredicate::predicateWithValue_forProperty(
                Some(value),
                MPMediaPlaylistPropertyPersistentID,
            );
            query.addFilterPredicate(&predicate);
            Some(query)
        }
    }

    /// The artwork of the playlist's first song: iOS does not give a playlist's own.
    pub fn artwork(id: &str) -> Option<String> {
        if !allowed() {
            return None;
        }
        // SAFETY: the query and the item are only read; `imageWithSize:`
        // takes the size it is sent.
        unsafe {
            let collections = query_for(id)?.collections()?;
            let item = collections.firstObject()?.representativeItem()?;
            let art = item.artwork()?;
            let side = f64::from(ARTWORK_SIDE);
            // Bound for UIKit only by hand: the crate builds `imageWithSize:` for AppKit.
            let image: Option<Retained<UIImage>> = msg_send![
                &art,
                imageWithSize: CGSize { width: side, height: side }
            ];
            data_url(&image?.jpeg_representation(0.8)?.to_vec())
        }
    }

    /// Plays the playlist shuffled, on the main thread, where the player must be used.
    pub fn play(app: &AppHandle, id: &str) -> Result<(), AppError> {
        if !allowed() {
            return Err(AppError::Music);
        }
        let (answer, answered) = mpsc::channel();
        let id = id.to_owned();
        app.run_on_main_thread(move || {
            let _ = answer.send(play_here(&id));
        })?;
        answered
            .recv_timeout(PLAY_WITHIN)
            .map_err(|_| AppError::Music)?
    }

    /// Call only on the main thread.
    fn play_here(id: &str) -> Result<(), AppError> {
        let query = query_for(id).ok_or(AppError::Music)?;
        // SAFETY: the system player is used on the main thread, with a query
        // that has a playlist.
        unsafe {
            if query.collections().is_none_or(|found| found.is_empty()) {
                return Err(AppError::Music);
            }
            let player = MPMusicPlayerController::systemMusicPlayer();
            player.setQueueWithQuery(&query);
            player.setShuffleMode(MPMusicShuffleMode::Songs);
            player.play();
        }
        Ok(())
    }
}

/// The person's playlists in the Music app.
#[cfg(target_os = "macos")]
pub fn playlists(_app: &AppHandle) -> Playlists {
    macos::playlists()
}

/// The person's playlists in the Music app.
#[cfg(target_os = "ios")]
pub fn playlists(_app: &AppHandle) -> Playlists {
    ios::playlists()
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
pub fn playlists(_app: &AppHandle) -> Playlists {
    Playlists::Unsupported
}

/// The playlist's artwork as a small JPEG `data:` URL; None when it has none.
#[cfg(target_os = "macos")]
pub fn artwork(_app: &AppHandle, id: &str) -> Option<String> {
    macos::artwork(id)
}

/// The playlist's artwork as a small JPEG `data:` URL; None when it has none.
#[cfg(target_os = "ios")]
pub fn artwork(_app: &AppHandle, id: &str) -> Option<String> {
    ios::artwork(id)
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
pub fn artwork(_app: &AppHandle, _id: &str) -> Option<String> {
    None
}

/// Starts the playlist in the Music app, shuffled.
#[cfg(target_os = "macos")]
pub fn play(_app: &AppHandle, id: &str) -> Result<(), AppError> {
    macos::play(id)
}

/// Starts the playlist in the Music app, shuffled.
#[cfg(target_os = "ios")]
pub fn play(app: &AppHandle, id: &str) -> Result<(), AppError> {
    ios::play(app, id)
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
pub fn play(_app: &AppHandle, _id: &str) -> Result<(), AppError> {
    Err(AppError::Music)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn playlists_are_read_in_pairs_of_name_and_id() {
        let read = parse_playlists("{\"朝 \\\"A\\\"\", \"D80B\", \"b, c\", \"12EF\"}\n");
        assert_eq!(
            read,
            Some(vec![
                Playlist {
                    id: "D80B".into(),
                    name: "朝 \"A\"".into()
                },
                Playlist {
                    id: "12EF".into(),
                    name: "b, c".into()
                },
            ])
        );
        assert_eq!(parse_playlists("{}\n"), Some(vec![]));
    }

    #[test]
    fn a_broken_list_of_playlists_is_nothing() {
        assert_eq!(parse_playlists("{\"a\"}"), None);
        assert_eq!(parse_playlists("{\"a\", 3}"), None);
        assert_eq!(parse_playlists(""), None);
    }

    #[test]
    fn artwork_is_read_from_its_hex() {
        assert_eq!(
            parse_data("«data tdta89504E47»\n"),
            Some(b"\x89PNG".to_vec())
        );
        assert_eq!(parse_data("missing value\n"), None);
        assert_eq!(parse_data("«data tdta8»"), None);
        let large = format!("«data tdta{}»", "00".repeat(MAX_ARTWORK + 1));
        assert_eq!(parse_data(&large), None);
    }

    #[test]
    fn only_pngs_and_jpegs_become_data_urls() {
        assert_eq!(
            data_url(b"\xFF\xD8\xFF").as_deref(),
            Some("data:image/jpeg;base64,/9j/")
        );
        assert!(
            data_url(b"\x89PNG")
                .unwrap()
                .starts_with("data:image/png;base64,")
        );
        assert_eq!(data_url(b"GIF89a"), None);
    }
}
