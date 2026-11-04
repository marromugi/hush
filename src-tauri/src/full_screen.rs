//! Lets the page reach the edges of an iPhone's screen. `viewport-fit=cover`
//! draws the page under the notch and the home indicator, but the webview
//! still shrinks the area that fixed elements fill by those insets unless its
//! scroll view stops adjusting for them. The page then keeps clear of them
//! itself, with `env(safe-area-inset-*)`.

use tauri::App;

/// Stops the main webview's scroll view from insetting the page on iOS.
#[cfg(target_os = "ios")]
pub fn extend(app: &App) -> tauri::Result<()> {
    use tauri::Manager;

    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    window.with_webview(|webview| {
        use objc2::msg_send;
        use objc2::runtime::AnyObject;

        /// `UIScrollViewContentInsetAdjustmentBehavior.never`.
        const NEVER: isize = 2;

        let wk_web_view = webview.inner().cast::<AnyObject>();
        // SAFETY: `inner` is the live WKWebView, and Tauri runs this closure on
        // the main thread, where UIKit must be called. `scrollView` always
        // returns a UIScrollView, which takes the setter.
        unsafe {
            let scroll_view: *mut AnyObject = msg_send![wk_web_view, scrollView];
            let _: () = msg_send![scroll_view, setContentInsetAdjustmentBehavior: NEVER];
        }
    })
}

/// Other platforms have no insets to undo.
#[cfg(not(target_os = "ios"))]
pub fn extend(_app: &App) -> tauri::Result<()> {
    Ok(())
}
