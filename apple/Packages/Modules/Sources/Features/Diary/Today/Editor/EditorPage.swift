import Foundation
import WebKit
import os

/// The editor page, and the requests it sends to the app. Nothing else talks
/// to the page.
final class EditorPage: NSObject, WKScriptMessageHandlerWithReply {
  /// The name the page posts its requests to.
  private static let handlerName = "hushEditor"

  let webPage: WebPage
  private let controller: WKUserContentController
  private let initialBody: String
  private let onChange: (String) -> Void

  /// Starts loading the page, which shows `initialBody` once it is ready.
  init(files: EditorFiles, initialBody: String, onChange: @escaping (String) -> Void) {
    var configuration = WebPage.Configuration()
    configuration.urlSchemeHandlers[.editor] = files
    controller = configuration.userContentController
    webPage = WebPage(configuration: configuration, navigationDecider: StayOnPage())
    self.initialBody = initialBody
    self.onChange = onChange
    super.init()
    // Added before the page loads, so that its first request is heard.
    controller.addScriptMessageHandler(self, contentWorld: .page, name: Self.handlerName)
    webPage.load(URLRequest(url: .editorPage))
  }

  /// Stops hearing the page. Until then the page holds this object, and this
  /// object holds the page.
  func close() {
    controller.removeScriptMessageHandler(forName: Self.handlerName, contentWorld: .page)
  }

  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) async -> (Any?, String?) {
    let request: EditorRequest
    do {
      request = try EditorRequest(message: message.body)
    } catch {
      log.error("the editor page sent a request the app cannot read: \(error, privacy: .public)")
      return (nil, "unknown")
    }
    switch request {
    case .ready:
      await show()
      return (nil, nil)
    case .changed(let body):
      onChange(body)
      return (nil, nil)
    case .saveImage, .readImage, .linkPage, .linkImage, .embedPagesOrigin:
      // The app does not do these yet; the page shows each as a failure.
      return (nil, "unknown")
    }
  }

  private func show() async {
    do {
      _ = try await webPage.callJavaScript(
        "window.hushEditor.load(entry)", arguments: ["entry": ["body": initialBody]])
    } catch {
      // WebKit fails the call when the page's process has ended. The page
      // then shows no editor, so nothing typed can overwrite the entry.
      log.error("the editor page did not take the entry: \(error, privacy: .public)")
    }
  }
}

/// Keeps the web view on the editor page, so that the entry stays on screen.
private struct StayOnPage: WebPage.NavigationDeciding {
  func decidePolicy(
    for action: WebPage.NavigationAction, preferences: inout WebPage.NavigationPreferences
  ) async -> WKNavigationActionPolicy {
    action.request.url?.scheme == URLScheme.editor.rawValue ? .allow : .cancel
  }
}

extension URLScheme {
  /// The scheme the editor page's files are served on.
  fileprivate static let editor: URLScheme = {
    guard let scheme = URLScheme("hush-editor") else {
      preconditionFailure("hush-editor is a scheme WebKit leaves to the app")
    }
    return scheme
  }()
}

extension URL {
  fileprivate static let editorPage: URL = {
    guard let url = URL(string: "hush-editor://app/editor.html") else {
      preconditionFailure("the editor page's address is a URL")
    }
    return url
  }()
}

private let log = Logger(subsystem: Bundle.main.bundleIdentifier ?? "Hush", category: "editor")
