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
    use objc2_foundation::{NSNotification, NSNotificationCenter, NSNumber, NSValue};
    use objc2_ui_kit::{
        NSValueUIGeometryExtensions, UIKeyboardFrameEndUserInfoKey, UIKeyboardIsLocalUserInfoKey,
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
                let Some(covered) = covered_height(&parent, notification) else {
                    return;
                };
                let bounds = parent.bounds();
                webview.setFrame(CGRect::new(
                    bounds.origin,
                    CGSize::new(bounds.size.width, bounds.size.height - covered),
                ));
                // Nothing to do if no window listens; the cursor then has nowhere to go.
                let _ = app.emit(super::KEYBOARD_MOVED, ());
            }
        }
    );

    /// How much of `parent`'s bottom the keyboard will cover once it has
    /// moved: 0 while it hides, floats, or is split, since those leave the
    /// bottom edge free. `None` for another app's keyboard, as in Split View.
    fn covered_height(parent: &UIView, notification: &NSNotification) -> Option<f64> {
        let info = notification.userInfo()?;
        // SAFETY: UIKit constants, read on the main thread; UIKit stores these
        // keys' values as an NSNumber holding a bool and an NSValue holding a CGRect.
        let (local, end) = unsafe {
            let local = info.objectForKey(UIKeyboardIsLocalUserInfoKey);
            let end = info.objectForKey(UIKeyboardFrameEndUserInfoKey)?;
            (local, end.downcast::<NSValue>().ok()?.CGRectValue())
        };
        let other_app = local
            .and_then(|local| local.downcast::<NSNumber>().ok())
            .is_some_and(|local| !local.boolValue());
        if other_app {
            return None;
        }
        let window = parent.window()?;
        // The frame comes in screen coordinates, which differ from the window's in Split View.
        let keyboard =
            parent.convertRect_fromView(window.convertRect_fromWindow(end, None), Some(&window));
        let bounds = parent.bounds();
        let spans_width = keyboard.size.width >= bounds.size.width - 1.0;
        let bottom = bounds.origin.y + bounds.size.height;
        let reaches_bottom = keyboard.origin.y + keyboard.size.height >= bottom - 1.0;
        if !spans_width || !reaches_bottom {
            return Some(0.0);
        }
        Some((bottom - keyboard.origin.y).clamp(0.0, bounds.size.height))
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
