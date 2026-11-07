import CoreEntrance
import SwiftUI
import WebKit

/// The editor, showing an entry and reporting each change to it.
struct EditorView: View {
  let files: EditorFiles
  let host: any EntryHost
  /// The body the editor starts with. Read once, when the editor appears.
  let initialBody: String
  let onChange: (String) -> Void
  /// Made when the editor appears, not with each update of this view.
  @State private var page: EditorPage?

  var body: some View {
    ZStack {
      if let page {
        WebView(page.webPage)
          .webViewBackForwardNavigationGestures(.disabled)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .onAppear {
      if page == nil {
        page = EditorPage(
          files: files, host: host, initialBody: initialBody, onChange: onChange)
      }
    }
    .onDisappear {
      page?.close()
      page = nil
    }
  }
}
