//! Tells the frontend when the system would leave the diary on an unattended
//! screen. The frontend locks, saving what is being written first; locking
//! here would drop that writing.

use tauri::AppHandle;

/// The event the frontend listens to.
pub const LOCK_REQUESTED: &str = "lock-requested";

/// Emits `LOCK_REQUESTED` on system sleep, display sleep, screen lock, and a
/// switch to another user. The observers live as long as the app.
#[cfg(target_os = "macos")]
pub fn watch(app: &AppHandle) {
    use block2::RcBlock;
    use objc2_app_kit::{
        NSWorkspace, NSWorkspaceScreensDidSleepNotification,
        NSWorkspaceSessionDidResignActiveNotification, NSWorkspaceWillSleepNotification,
    };
    use objc2_foundation::{NSDistributedNotificationCenter, NSNotification, NSString};
    use std::ptr::NonNull;
    use tauri::Emitter;

    let app = app.clone();
    let block = RcBlock::new(move |_: NonNull<NSNotification>| {
        // Nothing to do if no window listens; the vault then has nothing shown.
        let _ = app.emit(LOCK_REQUESTED, ());
    });

    let workspace = NSWorkspace::sharedWorkspace().notificationCenter();
    // Not in Apple's headers, but posted on every screen lock.
    let screen_locked = NSString::from_str("com.apple.screenIsLocked");
    // SAFETY: with no queue the block runs on the thread that posts the
    // notification. It only emits an event, which Tauri allows from any thread.
    unsafe {
        for name in [
            NSWorkspaceWillSleepNotification,
            NSWorkspaceScreensDidSleepNotification,
            NSWorkspaceSessionDidResignActiveNotification,
        ] {
            std::mem::forget(workspace.addObserverForName_object_queue_usingBlock(
                Some(name),
                None,
                None,
                &block,
            ));
        }
        std::mem::forget(
            NSDistributedNotificationCenter::defaultCenter()
                .addObserverForName_object_queue_usingBlock(
                    Some(&screen_locked),
                    None,
                    None,
                    &block,
                ),
        );
    }
}

/// Other platforms send nothing yet.
#[cfg(not(target_os = "macos"))]
pub fn watch(_app: &AppHandle) {}
