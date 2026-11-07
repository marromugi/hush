import Foundation
import Testing

@testable import Features

struct EditorFilesTests {
  /// A folder of built pages, with a file beside it that must stay out of reach.
  func pages() throws -> URL {
    let root = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    let folder = root.appending(path: "Web")
    try FileManager.default.createDirectory(
      at: folder.appending(path: "assets"), withIntermediateDirectories: true)
    try Data("<html></html>".utf8).write(to: folder.appending(path: "editor.html"))
    try Data("export {}".utf8).write(to: folder.appending(path: "assets/editor.js"))
    try Data("secret".utf8).write(to: root.appending(path: "outside.txt"))
    return folder
  }

  func reply(_ files: EditorFiles, _ address: String) async throws -> (URLResponse?, Data) {
    let url = try #require(URL(string: address))
    return try await files.file(for: URLRequest(url: url))
  }

  // WebKit runs a module script only when it comes with a JavaScript type.
  @Test(arguments: [
    ("hush-editor://app/editor.html", "text/html", "<html></html>"),
    ("hush-editor://app/assets/editor.js", "text/javascript", "export {}"),
  ])
  func aPageFileComesWithItsType(address: String, type: String, contents: String) async throws {
    let (response, data) = try await reply(EditorFiles(folder: pages()), address)
    #expect(response?.mimeType == type)
    #expect(String(decoding: data, as: UTF8.self) == contents)
  }

  @Test(arguments: ["hush-editor://app/../outside.txt", "hush-editor://app/%2E%2E/outside.txt"])
  func aFileOutsideTheFolderIsNotServed(address: String) async throws {
    let files = EditorFiles(folder: try pages())
    await #expect(throws: (any Error).self) { try await reply(files, address) }
  }
}
