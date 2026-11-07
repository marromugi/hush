import CoreEntrance
import Foundation
import WebKit
import os

/// The editor page, and the requests it sends to the app. Nothing else talks
/// to the page. It lives as long as whoever keeps it: nothing the page holds
/// keeps it alive.
final class EditorPage {
  /// What the page shows.
  enum Content {
    /// An entry to edit, starting from `initialBody`. Each change goes to `onChange`.
    case editor(initialBody: String, onChange: (String) -> Void)
    /// An entry to read only.
    case reader(body: String)
  }

  /// The name the page posts its requests to.
  private static let handlerName = "hushEditor"
  /// The scheme the page's files are served on.
  fileprivate static let scheme = "hush-editor"

  let webView: WKWebView
  /// The web view holds its navigation delegate weakly.
  private let navigation = StayOnPage()
  private let host: any EntryHost
  private let content: Content

  /// Starts loading the page, which shows `content` once it is ready.
  init(files: EditorFiles, host: any EntryHost, content: Content) {
    let configuration = WKWebViewConfiguration()
    configuration.setURLSchemeHandler(FileServer(files: files), forURLScheme: Self.scheme)
    webView = WKWebView(frame: .zero, configuration: configuration)
    self.host = host
    self.content = content
    webView.navigationDelegate = navigation
    // Added before the page loads, so that its first request is heard.
    webView.configuration.userContentController.addScriptMessageHandler(
      Requests(to: self), contentWorld: .page, name: Self.handlerName)
    webView.load(URLRequest(url: .editorPage))
  }

  /// The answer to one request: a reply, or the failure's kind as the page names it.
  fileprivate func answer(_ message: WKScriptMessage) async -> (Any?, String?) {
    let request: EditorRequest
    do {
      request = try EditorRequest(message: message.body)
    } catch {
      log.error("the editor page sent a request the app cannot read: \(error, privacy: .public)")
      return (nil, "unknown")
    }
    do throws(AppError) {
      return (try await reply(to: request), nil)
    } catch {
      return (nil, error.pageKind)
    }
  }

  /// What the page is answered with: text, or an object of text and nulls.
  /// Bytes go as base64 text both ways.
  private func reply(to request: EditorRequest) async throws(AppError) -> Any? {
    switch request {
    case .ready:
      await show()
      return nil
    case .changed(let body):
      guard case .editor(_, let onChange) = content else {
        log.error("the editor page reported a change to an entry shown to read only")
        throw .unexpected
      }
      onChange(body)
      return nil
    case .saveImage(let picture):
      guard let bytes = Data(base64Encoded: picture) else {
        log.error("the editor page sent a picture that is not base64")
        throw .unexpected
      }
      return try await host.saveImage(bytes)
    case .readImage(let id):
      return try await host.image(id: id).base64EncodedString()
    case .linkPage(let url):
      let page = try await host.linkPage(at: url)
      // The page takes a missing title or picture as null, never as an absent field.
      return [
        "title": (page.title as Any?) ?? NSNull(),
        "imageUrl": (page.imageURL as Any?) ?? NSNull(),
      ]
    case .linkImage(let url):
      return try await host.linkImage(at: url).base64EncodedString()
    case .embedPagesOrigin:
      return try await host.embedPagesOrigin()
    }
  }

  private func show() async {
    let (call, body) =
      switch content {
      case .editor(let initialBody, _): ("load", initialBody)
      case .reader(let body): ("read", body)
      }
    do {
      _ = try await webView.callAsyncJavaScript(
        "window.hushEditor.\(call)(entry)", arguments: ["entry": ["body": body]],
        contentWorld: .page)
    } catch {
      // WebKit fails the call when the page's process has ended. The page
      // then shows no editor, so nothing typed can overwrite the entry.
      log.error("the editor page did not take the entry: \(error, privacy: .public)")
    }
  }
}

/// Passes the page's requests to the editor page while it exists. The page's
/// controller holds this object, so it holds the editor page weakly; holding
/// it strongly would keep the editor page, and the page, alive for good.
private final class Requests: NSObject, WKScriptMessageHandlerWithReply {
  private weak var page: EditorPage?

  init(to page: EditorPage) {
    self.page = page
  }

  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) async -> (Any?, String?) {
    guard let page else { return (nil, "unknown") }
    return await page.answer(message)
  }
}

/// Serves the page's files from the folder in the app. Files are read off
/// the main actor; a request WebKit has stopped is not answered, since
/// answering it raises an exception.
private final class FileServer: NSObject, WKURLSchemeHandler {
  private let files: EditorFiles
  /// The requests started and not yet stopped or answered.
  private var running: Set<ObjectIdentifier> = []

  init(files: EditorFiles) {
    self.files = files
  }

  func webView(_ webView: WKWebView, start task: any WKURLSchemeTask) {
    let id = ObjectIdentifier(task)
    running.insert(id)
    let request = task.request
    Task {
      let file: (URLResponse, Data)
      do {
        file = try await files.file(for: request)
      } catch {
        if running.remove(id) != nil { task.didFailWithError(error) }
        return
      }
      guard running.remove(id) != nil else { return }
      task.didReceive(file.0)
      task.didReceive(file.1)
      task.didFinish()
    }
  }

  func webView(_ webView: WKWebView, stop task: any WKURLSchemeTask) {
    running.remove(ObjectIdentifier(task))
  }
}

/// Keeps the web view on the editor page, so that the entry stays on screen.
/// The frames inside it, which show an entry's videos and posts, load
/// wherever they point; a new window opens nowhere.
private final class StayOnPage: NSObject, WKNavigationDelegate {
  func webView(
    _ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
    decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void
  ) {
    guard let frame = action.targetFrame else { return decisionHandler(.cancel) }
    if !frame.isMainFrame { return decisionHandler(.allow) }
    decisionHandler(action.request.url?.scheme == EditorPage.scheme ? .allow : .cancel)
  }
}

extension AppError {
  /// The failure's kind as the page names it (`HushErrorKind` on the web side).
  fileprivate var pageKind: String {
    switch self {
    case .unsupportedPicture: "unsupportedPicture"
    case .newerImage: "newerImageVersion"
    case .brokenImage: "brokenImage"
    case .invalidImageId: "invalidImageId"
    case .noImage: "noImage"
    case .link: "link"
    case .unreadableLink: "unreadableLink"
    case .embedPages: "embedPages"
    case .emptyPassphrase, .wrongPassphrase, .wrongPassphraseOrSecretKey, .invalidSecretKey,
      .noSecretKey, .newerVault, .outdatedVault, .brokenVault, .keychain, .noBiometry,
      .biometryCancelled, .biometryFailed, .biometricKeychain, .noKeptKey, .newerEntry,
      .brokenEntry, .unexpected:
      "unknown"
    }
  }
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
