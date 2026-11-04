//! What the Music app is playing, shown in a corner of the diary screen.
//! Only Apple's Music app can be read: macOS no longer lets other apps see
//! what any app is playing. Nothing here starts the Music app. Reading the
//! Music app's answer is built only where it is asked, and for the tests.

#[cfg(any(target_os = "macos", test))]
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

/// The largest album art sent to the page. The card shows it 48px wide, and
/// every byte crosses into the webview on each change of song.
#[cfg(any(target_os = "macos", test))]
const MAX_ARTWORK: usize = 1024 * 1024;

/// A `data:` URL for an image, typed by its first bytes; None for anything
/// that is not a PNG or a JPEG, which the page could not show.
#[cfg(any(target_os = "macos", test))]
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
#[cfg(any(target_os = "macos", test))]
fn parse(out: &str) -> Option<NowPlaying> {
    let mut rest = out.trim().strip_prefix('{')?.strip_suffix('}')?;
    let title = take_string(&mut rest)?;
    rest = rest.strip_prefix(", ")?;
    let artist = take_string(&mut rest)?;
    rest = rest.strip_prefix(", ")?;
    let artwork = match rest.strip_prefix("«data ") {
        // Four letters name the data's type, then the bytes in hex.
        Some(data) => {
            let digits = data.strip_suffix('»')?.get(4..)?;
            // Larger art is left out, and the title stands in for it.
            (digits.len() <= MAX_ARTWORK * 2)
                .then(|| hex(digits))
                .flatten()
                .and_then(|bytes| data_url(&bytes))
        }
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
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::mpsc::{self, Sender};
    use std::thread;
    use std::time::{Duration, Instant};

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

    /// How long the Music app may take to answer, its permission prompt
    /// included, before the question is dropped and nothing is shown.
    const ANSWER_WITHIN: Duration = Duration::from_secs(10);

    /// Set once the diary screen has asked what plays. Until then the Music
    /// app is never asked, so its permission prompt cannot come up over the
    /// lock screen.
    static ASKED: AtomicBool = AtomicBool::new(false);

    /// What plays now. The first time, macOS asks the person whether Hush
    /// may control the Music app; while they have not allowed it, nothing.
    pub fn read() -> Option<NowPlaying> {
        ASKED.store(true, Ordering::Relaxed);
        parse(&run(SCRIPT, ANSWER_WITHIN)?)
    }

    /// What `osascript` prints for `script`; None when it fails or takes longer than `limit`.
    fn run(script: &str, limit: Duration) -> Option<String> {
        let mut child = Command::new("osascript")
            .args(["-s", "s", "-e", script])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .ok()?;
        // Read while it runs: album art can be more than the pipe holds, and
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

    define_class!(
        /// Receives the Music app's notice of every change of song or of
        /// playing and pausing, and passes it to the worker in `watch`.
        #[unsafe(super(NSObject))]
        #[name = "HushNowPlaying"]
        #[ivars = Sender<()>]
        struct Watcher;

        impl Watcher {
            #[unsafe(method(changed:))]
            fn changed(&self, _notification: &NSNotification) {
                let _ = self.ivars().send(());
            }
        }
    );

    impl Watcher {
        fn new(changes: Sender<()>) -> Retained<Self> {
            let this = Self::alloc().set_ivars(changes);
            // SAFETY: NSObject's init on a freshly allocated instance.
            unsafe { msg_send![super(this), init] }
        }
    }

    /// Emits `NOW_PLAYING_CHANGED` after notices from the Music app, once the
    /// diary screen has asked (`read`). One worker answers them in order, and
    /// notices that pile up while it asks are answered once, so an older
    /// answer never lands after a newer one. The observer lives as long as
    /// the app, since the centre does not retain it.
    pub fn watch(app: &AppHandle) {
        let (changes, notices) = mpsc::channel::<()>();
        let app = app.clone();
        thread::spawn(move || {
            while notices.recv().is_ok() {
                while notices.try_recv().is_ok() {}
                if ASKED.load(Ordering::Relaxed) {
                    let _ = app.emit(NOW_PLAYING_CHANGED, read());
                }
            }
        });
        let watcher = Watcher::new(changes);
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

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn a_long_answer_is_read_whole() {
            let out = run(
                r#"return text 1 thru 300000 of (do shell script "head -c 300000 /dev/zero | tr '\\0' x")"#,
                ANSWER_WITHIN,
            );
            assert_eq!(out.map(|out| out.trim().len()), Some(300_002));
        }

        #[test]
        fn an_answer_that_takes_too_long_is_dropped() {
            let started = Instant::now();
            assert_eq!(run("delay 5", Duration::from_millis(300)), None);
            assert!(started.elapsed() < Duration::from_secs(2));
        }
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

/// Emits `NOW_PLAYING_CHANGED` whenever the Music app changes song or starts
/// or stops playing, once the diary screen has asked what plays.
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
    fn titles_keep_line_breaks_tabs_and_marks_osascript_prints_as_they_are() {
        let read = parse("{\"a\\\\\", \"b\nc\td «x» 😀, \\\"\", missing value}").unwrap();
        assert_eq!(read.title, "a\\");
        assert_eq!(read.artist, "b\nc\td «x» 😀, \"");
    }

    #[test]
    fn art_too_large_to_send_is_left_out() {
        let large = format!(
            "{{\"a\", \"b\", «data tdta89504E47{}»}}",
            "00".repeat(MAX_ARTWORK)
        );
        assert_eq!(parse(&large).unwrap().artwork, None);
    }

    #[test]
    fn nothing_playing_or_anything_unexpected_is_nothing() {
        assert_eq!(parse("\"\"\n"), None);
        assert_eq!(parse(""), None);
        assert_eq!(parse("{\"a\"}"), None);
        assert_eq!(parse("{\"a\", \"b\", 3}"), None);
    }
}
