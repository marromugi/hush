import Foundation
import UniformTypeIdentifiers
import WebKit

/// The editor page's files, served to its web view from a folder in the app.
/// Files are read wherever WebKit asks for them, not on the main actor.
nonisolated public struct EditorFiles: URLSchemeHandler, Sendable {
  private let folder: URL

  /// `folder` holds the built web pages, with `editor.html` at its top.
  public init(folder: URL) {
    self.folder = folder.standardizedFileURL
  }

  public func reply(for request: URLRequest) -> AsyncThrowingStream<URLSchemeTaskResult, any Error>
  {
    AsyncThrowingStream { continuation in
      do {
        let (response, data) = try file(for: request)
        continuation.yield(.response(response))
        continuation.yield(.data(data))
        continuation.finish()
      } catch {
        continuation.finish(throwing: error)
      }
    }
  }

  private func file(for request: URLRequest) throws -> (URLResponse, Data) {
    guard let url = request.url else { throw URLError(.badURL) }
    let file = folder.appending(path: url.path(percentEncoded: false)).standardizedFileURL
    // A path with `..` must not reach a file outside the folder.
    guard file.pathComponents.starts(with: folder.pathComponents) else {
      throw URLError(.fileDoesNotExist)
    }
    let data = try Data(contentsOf: file)
    let type = UTType(filenameExtension: file.pathExtension)?.preferredMIMEType
    let response = URLResponse(
      url: url, mimeType: type ?? "application/octet-stream",
      expectedContentLength: data.count, textEncodingName: nil)
    return (response, data)
  }
}
