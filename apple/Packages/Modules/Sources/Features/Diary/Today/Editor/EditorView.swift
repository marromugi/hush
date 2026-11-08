import CoreEntrance
import SwiftUI
import WebKit

/// The editor page, showing an entry to edit or to read.
struct EditorView: View {
  let files: EditorFiles
  let host: any EntryHost
  /// Read once, when the page appears.
  let content: EditorPage.Content
  /// Made when the editor first appears, not with each update of this view,
  /// and gone with this view. Not closed when it disappears: a navigation
  /// column can disappear and stay on screen.
  @State private var page: EditorPage?

  var body: some View {
    ZStack {
      if let page {
        WebViewHost(webView: page.webView)
          // WebKit keeps the page clear of the keyboard itself. Shrunk
          // above it as well, the page could scroll on past its end.
          .ignoresSafeArea(.keyboard)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .onAppear {
      if page == nil {
        page = EditorPage(files: files, host: host, content: content)
      }
    }
  }
}

/// Places a web view made elsewhere. Updates change nothing in it, so the
/// page is never loaded again.
#if os(iOS)
  private struct WebViewHost: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> WKWebView { webView }

    func updateUIView(_ view: WKWebView, context: Context) {}
  }
#else
  private struct WebViewHost: NSViewRepresentable {
    let webView: WKWebView

    func makeNSView(context: Context) -> WKWebView { webView }

    func updateNSView(_ view: WKWebView, context: Context) {}
  }
#endif
