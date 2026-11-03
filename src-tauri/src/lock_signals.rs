//! Tells the frontend when the system would leave the diary on an unattended
//! screen. The frontend locks, saving what is being written first; locking
//! here would drop that writing.

use tauri::{AppHandle, Window, WindowEvent};

/// The event the frontend listens to.
pub const LOCK_REQUESTED: &str = "lock-requested";

#[cfg(target_os = "macos")]
mod macos {
    use objc2::rc::Retained;
    use objc2::runtime::NSObject;
    use objc2::{AllocAnyThread, DefinedClass, define_class, msg_send, sel};
    use objc2_app_kit::{NSWorkspace, NSWorkspaceWillSleepNotification};
    use objc2_foundation::{
        NSDistributedNotificationCenter, NSNotification, NSNotificationSuspensionBehavior, NSString,
    };
    use tauri::{AppHandle, Emitter};

    use super::LOCK_REQUESTED;

    define_class!(
        /// Receives the notifications and asks the frontend to lock.
        #[unsafe(super(NSObject))]
        #[name = "HushLockSignals"]
        #[ivars = AppHandle]
        struct LockSignals;

        impl LockSignals {
            #[unsafe(method(lockRequested:))]
            fn lock_requested(&self, _notification: &NSNotification) {
                // Nothing to do if no window listens; the vault then has nothing shown.
                let _ = self.ivars().emit(LOCK_REQUESTED, ());
            }
        }
    );

    impl LockSignals {
        fn new(app: AppHandle) -> Retained<Self> {
            let this = Self::alloc().set_ivars(app);
            // SAFETY: NSObject's init on a freshly allocated instance.
            unsafe { msg_send![super(this), init] }
        }
    }

    /// Emits `LOCK_REQUESTED` on system sleep and on screen lock. The
    /// observer lives as long as the app, since the centres do not retain it.
    pub fn watch(app: &AppHandle) {
        let signals = LockSignals::new(app.clone());
        // Not in Apple's headers, but posted on every screen lock.
        let screen_locked = NSString::from_str("com.apple.screenIsLocked");
        // SAFETY: `signals` implements `lockRequested:` taking one notification,
        // and is kept alive below for the rest of the process.
        unsafe {
            NSWorkspace::sharedWorkspace()
                .notificationCenter()
                .addObserver_selector_name_object(
                    &signals,
                    sel!(lockRequested:),
                    Some(NSWorkspaceWillSleepNotification),
                    None,
                );
            // AppKit holds back distributed notifications while the app is in
            // the background unless asked to deliver them at once; a screen
            // locked over another app must still lock the diary.
            NSDistributedNotificationCenter::defaultCenter()
                .addObserver_selector_name_object_suspensionBehavior(
                    &signals,
                    sel!(lockRequested:),
                    Some(&screen_locked),
                    None,
                    NSNotificationSuspensionBehavior::DeliverImmediately,
                );
        }
        std::mem::forget(signals);
    }
}

/// Emits `LOCK_REQUESTED` on system sleep and on screen lock.
#[cfg(target_os = "macos")]
pub fn watch(app: &AppHandle) {
    macos::watch(app);
}

/// Other platforms send nothing yet.
#[cfg(not(target_os = "macos"))]
pub fn watch(_app: &AppHandle) {}

/// Emits `LOCK_REQUESTED` when the app stops being in front: on iOS as soon
/// as it becomes inactive, Control Center and the app switcher included, so
/// the switcher's snapshot shows the locked screen.
#[cfg(mobile)]
pub fn on_window_event(window: &Window, event: &WindowEvent) {
    use tauri::Emitter;

    if let WindowEvent::Suspended = event {
        // Nothing to do if no window listens; the vault then has nothing shown.
        let _ = window.emit(LOCK_REQUESTED, ());
    }
}

/// Desktop windows send nothing here; `watch` covers sleep and screen lock.
#[cfg(not(mobile))]
pub fn on_window_event(_window: &Window, _event: &WindowEvent) {}
