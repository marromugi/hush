import CoreEntrance
import SwiftUI
import WebKit

/// The editor page, showing an entry to edit or to read.
struct EditorView: View {
  let files: EditorFiles
  let host: any EntryHost
  /// Read once, when the page appears.
  let content: EditorPage.Content
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
        page = EditorPage(files: files, host: host, content: content)
      }
    }
    .onDisappear {
      page?.close()
      page = nil
    }
  }
}
