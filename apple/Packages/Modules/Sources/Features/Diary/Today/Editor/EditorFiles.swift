import Foundation
import UniformTypeIdentifiers

/// The editor page's files, from a folder in the app.
nonisolated public struct EditorFiles: Sendable {
  private let folder: URL

  /// `folder` holds the built web pages, with `editor.html` at its top.
  public init(folder: URL) {
    self.folder = folder.standardizedFileURL
  }

  /// The file `request` asks for, with its type. Reads the disk, so it
  /// leaves the main actor.
  @concurrent
  func file(for request: URLRequest) async throws -> (URLResponse, Data) {
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
