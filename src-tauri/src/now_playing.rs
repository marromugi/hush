//! What the Music app is playing, shown in a corner of the diary screen.
//! Only Apple's Music app can be read: macOS no longer lets other apps see
//! what any app is playing. Nothing here starts the Music app.

use base64ct::{Base64, Encoding};
use serde::Serialize;
use tauri::AppHandle;

/// The event the frontend listens to; it carries an `Option<NowPlaying>`.
pub const NOW_PLAYING_CHANGED: &str = "now-playing-changed";

/// A song while it plays; nothing while paused or stopped.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    /// The album art as a `data:` URL, when the song has one.
    pub artwork: Option<String>,
}

/// A `data:` URL for an image, typed by its first bytes; None for anything
/// that is not a PNG or a JPEG, which the page could not show.
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

/// Reads what `osascript -s s` prints for `{"title", "artist", «data ...»}`,
/// the last item being `missing value` when the song has no art. Anything
/// else, the empty string printed when nothing plays included, is None.
fn parse(out: &str) -> Option<NowPlaying> {
    let mut rest = out.trim().strip_prefix('{')?.strip_suffix('}')?;
    let title = take_string(&mut rest)?;
    rest = rest.strip_prefix(", ")?;
    let artist = take_string(&mut rest)?;
    rest = rest.strip_prefix(", ")?;
    let artwork = match rest.strip_prefix("«data ") {
        // Four letters name the data's type, then the bytes in hex.
        Some(data) => hex(data.strip_suffix('»')?.get(4..)?).and_then(|bytes| data_url(&bytes)),
        None if rest == "missing value" => None,
        None => return None,
    };
    Some(NowPlaying {
        title,
        artist,
        artwork,
    })
}

/// Takes a quoted AppleScript string off the front of `rest`, undoing its `\"` and `\\`.
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
    use std::process::Command;

    use objc2::rc::Retained;
    use objc2::runtime::NSObject;
    use objc2::{AllocAnyThread, DefinedClass, define_class, msg_send, sel};
    use objc2_foundation::{
        NSDistributedNotificationCenter, NSNotification, NSNotificationSuspensionBehavior, NSString,
    };
    use tauri::{AppHandle, Emitter};

    use super::{NOW_PLAYING_CHANGED, NowPlaying, parse};

    /// Asks the Music app only if it is already open, since `tell` would open it.
    const SCRIPT: &str = r#"
if application "Music" is running then
  tell application "Music"
    if player state is playing then
      set song to current track
      set art to missing value
      try
        set art to raw data of artwork 1 of song
      end try
      return {name of song, artist of song, art}
    end if
  end tell
end if
return ""
"#;

    /// What plays now. The first time, macOS asks the person whether Hush
    /// may control the Music app; while they have not allowed it, nothing.
    pub fn read() -> Option<NowPlaying> {
        let out = Command::new("osascript")
            .args(["-s", "s", "-e", SCRIPT])
            .output()
            .ok()?;
        if !out.status.success() {
            return None;
        }
        parse(&String::from_utf8_lossy(&out.stdout))
    }

    define_class!(
        /// Receives the Music app's notice of every change of song or of
        /// playing and pausing, and sends the frontend what plays now.
        #[unsafe(super(NSObject))]
        #[name = "HushNowPlaying"]
        #[ivars = AppHandle]
        struct Watcher;

        impl Watcher {
            #[unsafe(method(changed:))]
            fn changed(&self, _notification: &NSNotification) {
                let app = self.ivars().clone();
                // The script waits on the Music app, so it stays off the main thread.
                std::thread::spawn(move || {
                    let _ = app.emit(NOW_PLAYING_CHANGED, read());
                });
            }
        }
    );

    impl Watcher {
        fn new(app: AppHandle) -> Retained<Self> {
            let this = Self::alloc().set_ivars(app);
            // SAFETY: NSObject's init on a freshly allocated instance.
            unsafe { msg_send![super(this), init] }
        }
    }

    /// Emits `NOW_PLAYING_CHANGED` on every notice from the Music app. The
    /// observer lives as long as the app, since the centre does not retain it.
    pub fn watch(app: &AppHandle) {
        let watcher = Watcher::new(app.clone());
        let player_info = NSString::from_str("com.apple.Music.playerInfo");
        // SAFETY: `watcher` implements `changed:` taking one notification,
        // and is kept alive below for the rest of the process.
        unsafe {
            // Songs change while Hush is in the background too.
            NSDistributedNotificationCenter::defaultCenter()
                .addObserver_selector_name_object_suspensionBehavior(
                    &watcher,
                    sel!(changed:),
                    Some(&player_info),
                    None,
                    NSNotificationSuspensionBehavior::DeliverImmediately,
                );
        }
        std::mem::forget(watcher);
    }
}

/// What plays now in the Music app; nothing while it is paused, stopped, or closed.
#[cfg(target_os = "macos")]
pub fn read() -> Option<NowPlaying> {
    macos::read()
}

/// Other platforms cannot read it yet.
#[cfg(not(target_os = "macos"))]
pub fn read() -> Option<NowPlaying> {
    None
}

/// Emits `NOW_PLAYING_CHANGED` whenever the Music app changes song or starts or stops playing.
#[cfg(target_os = "macos")]
pub fn watch(app: &AppHandle) {
    macos::watch(app);
}

/// Other platforms send nothing yet.
#[cfg(not(target_os = "macos"))]
pub fn watch(_app: &AppHandle) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_song_with_art_is_read_with_its_art_as_a_data_url() {
        let read = parse("{\"Song \\\"A\\\" \\\\ x\", \"アーティスト\", «data tdta89504E47»}\n");
        assert_eq!(
            read,
            Some(NowPlaying {
                title: "Song \"A\" \\ x".into(),
                artist: "アーティスト".into(),
                artwork: Some(format!(
                    "data:image/png;base64,{}",
                    Base64::encode_string(b"\x89PNG")
                )),
            })
        );
    }

    #[test]
    fn a_song_without_art_or_with_art_the_page_cannot_show_has_none() {
        let none = parse("{\"a\", \"b\", missing value}").unwrap();
        assert_eq!(none.artwork, None);
        let gif = parse("{\"a\", \"b\", «data tdta47494638»}").unwrap();
        assert_eq!(gif.artwork, None);
        let broken = parse("{\"a\", \"b\", «data tdta8»}").unwrap();
        assert_eq!(broken.artwork, None);
        let jpeg = parse("{\"a\", \"b\", «data JPEGFFD8FF»}").unwrap();
        assert_eq!(jpeg.artwork.as_deref(), Some("data:image/jpeg;base64,/9j/"));
    }

    #[test]
    fn nothing_playing_or_anything_unexpected_is_nothing() {
        assert_eq!(parse("\"\"\n"), None);
        assert_eq!(parse(""), None);
        assert_eq!(parse("{\"a\"}"), None);
        assert_eq!(parse("{\"a\", \"b\", 3}"), None);
    }
}
