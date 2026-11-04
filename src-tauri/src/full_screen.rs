//! Fits the webview to an iPhone's screen.
//!
//! `viewport-fit=cover` draws the page under the notch and the home
//! indicator, but the webview still shrinks the area that fixed elements fill
//! by those insets unless its scroll view stops adjusting for them. The page
//! then keeps clear of them itself, with `env(safe-area-inset-*)`.
//!
//! The on-screen keyboard is kept out of the webview: its bottom follows the
//! keyboard's top. Left over it, the keyboard would make WebKit pan the page
//! under the sticky header and footer, which the page could only chase a
//! frame late.

use tauri::App;

/// The event the frontend listens to after the keyboard has moved, to bring
/// the cursor back into view.
pub const KEYBOARD_MOVED: &str = "keyboard-moved";

#[cfg(target_os = "ios")]
mod ios {
    use objc2::rc::Retained;
    use objc2::runtime::{AnyObject, NSObject};
    use objc2::{DefinedClass, MainThreadMarker, MainThreadOnly, define_class, msg_send, sel};
    use objc2_core_foundation::{CGRect, CGSize};
    use objc2_foundation::{NSNotification, NSNotificationCenter, NSValue};
    use objc2_ui_kit::{
        NSValueUIGeometryExtensions, UIKeyboardFrameEndUserInfoKey,
        UIKeyboardWillChangeFrameNotification, UIView,
    };
    use tauri::{AppHandle, Emitter};

    define_class!(
        /// Receives the keyboard's moves, fits the webview above it, and tells the frontend.
        #[unsafe(super(NSObject))]
        #[thread_kind = MainThreadOnly]
        #[name = "HushKeyboardFit"]
        #[ivars = (Retained<UIView>, AppHandle)]
        struct KeyboardFit;

        impl KeyboardFit {
            #[unsafe(method(keyboardWillChangeFrame:))]
            fn keyboard_will_change_frame(&self, notification: &NSNotification) {
                let (webview, app) = self.ivars();
                let Some(parent) = webview.superview() else {
                    return;
                };
                let Some(end) = keyboard_end(notification) else {
                    return;
                };
                // The frame comes in screen coordinates; the app fills the screen,
                // so the window's are the same.
                let keyboard = parent.convertRect_fromView(end, None);
                let bounds = parent.bounds();
                let covered = (bounds.size.height - keyboard.origin.y).clamp(0.0, bounds.size.height);
                webview.setFrame(CGRect::new(
                    bounds.origin,
                    CGSize::new(bounds.size.width, bounds.size.height - covered),
                ));
                // Nothing to do if no window listens; the cursor then has nowhere to go.
                let _ = app.emit(super::KEYBOARD_MOVED, ());
            }
        }
    );

    /// Where the keyboard will be once it has moved, off the screen when hiding.
    fn keyboard_end(notification: &NSNotification) -> Option<CGRect> {
        let info = notification.userInfo()?;
        // SAFETY: a UIKit constant, read on the main thread.
        let value = info.objectForKey(unsafe { UIKeyboardFrameEndUserInfoKey })?;
        let value = value.downcast::<NSValue>().ok()?;
        // SAFETY: UIKit stores this key's value as an NSValue holding a CGRect.
        Some(unsafe { value.CGRectValue() })
    }

    /// Stops the scroll view from insetting the page, and keeps the webview
    /// above the keyboard for the rest of the process.
    pub fn fit(wk_web_view: *mut AnyObject, app: AppHandle) {
        /// `UIScrollViewContentInsetAdjustmentBehavior.never`.
        const NEVER: isize = 2;

        // Tauri runs this on the main thread, where UIKit must be called.
        let Some(mtm) = MainThreadMarker::new() else {
            return;
        };
        // SAFETY: `wk_web_view` is the live WKWebView, a UIView, retained here
        // for as long as the observer lives. `scrollView` always returns a
        // UIScrollView, which takes the setter.
        let webview: Retained<UIView> = unsafe {
            let scroll_view: *mut AnyObject = msg_send![wk_web_view, scrollView];
            let _: () = msg_send![scroll_view, setContentInsetAdjustmentBehavior: NEVER];
            Retained::retain(wk_web_view.cast::<UIView>()).expect("the webview exists")
        };

        let fit = KeyboardFit::alloc(mtm).set_ivars((webview, app));
        // SAFETY: NSObject's init on a freshly allocated instance.
        let fit: Retained<KeyboardFit> = unsafe { msg_send![super(fit), init] };
        // SAFETY: `fit` implements `keyboardWillChangeFrame:` taking one
        // notification, and is kept alive below for the rest of the process.
        unsafe {
            NSNotificationCenter::defaultCenter().addObserver_selector_name_object(
                &fit,
                sel!(keyboardWillChangeFrame:),
                Some(UIKeyboardWillChangeFrameNotification),
                None,
            );
        }
        std::mem::forget(fit);
    }
}

/// Fits the main webview to the screen and keeps it above the keyboard on iOS.
#[cfg(target_os = "ios")]
pub fn extend(app: &App) -> tauri::Result<()> {
    use tauri::Manager;

    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let app = app.handle().clone();
    window.with_webview(move |webview| ios::fit(webview.inner().cast(), app))
}

/// Other platforms have no insets to undo or on-screen keyboard to avoid.
#[cfg(not(target_os = "ios"))]
pub fn extend(_app: &App) -> tauri::Result<()> {
    Ok(())
}
