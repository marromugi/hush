import CoreEntrance
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
  private let host: any EntryHost
  private let initialBody: String
  private let onChange: (String) -> Void

  /// Starts loading the page, which shows `initialBody` once it is ready.
  init(
    files: EditorFiles, host: any EntryHost, initialBody: String,
    onChange: @escaping (String) -> Void
  ) {
    var configuration = WebPage.Configuration()
    configuration.urlSchemeHandlers[.editor] = files
    controller = configuration.userContentController
    webPage = WebPage(configuration: configuration, navigationDecider: StayOnPage())
    self.host = host
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
/// The frames inside it, which show an entry's videos and posts, load
/// wherever they point; a new window opens nowhere.
private struct StayOnPage: WebPage.NavigationDeciding {
  func decidePolicy(
    for action: WebPage.NavigationAction, preferences: inout WebPage.NavigationPreferences
  ) async -> WKNavigationActionPolicy {
    guard let frame = action.target else { return .cancel }
    if !frame.isMainFrame { return .allow }
    return action.request.url?.scheme == URLScheme.editor.rawValue ? .allow : .cancel
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
      .noSecretKey, .newerVault, .outdatedVault, .brokenVault, .keychain, .newerEntry,
      .brokenEntry, .unexpected:
      "unknown"
    }
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
