import Foundation

/// What the editor page asks of the app (`src/lib/diary/editorChannel` on
/// the web side).
nonisolated enum EditorRequest: Equatable {
  /// The page can be given an entry. Sent once, when the page has started.
  case ready
  /// The body as HTML, after every change.
  case changed(body: String)
  /// A picture as base64, to be saved as a new image.
  case saveImage(picture: String)
  case readImage(id: String)
  case linkPage(url: String)
  case linkImage(url: String)
  case embedPagesOrigin
}

extension EditorRequest: Decodable {
  private enum Kind: String, Decodable {
    case ready, changed, saveImage, readImage, linkPage, linkImage, embedPagesOrigin
  }

  private enum Field: CodingKey {
    case kind, body, picture, id, url
  }

  init(from decoder: any Decoder) throws {
    let message = try decoder.container(keyedBy: Field.self)
    switch try message.decode(Kind.self, forKey: .kind) {
    case .ready: self = .ready
    case .changed: self = .changed(body: try message.decode(String.self, forKey: .body))
    case .saveImage: self = .saveImage(picture: try message.decode(String.self, forKey: .picture))
    case .readImage: self = .readImage(id: try message.decode(String.self, forKey: .id))
    case .linkPage: self = .linkPage(url: try message.decode(String.self, forKey: .url))
    case .linkImage: self = .linkImage(url: try message.decode(String.self, forKey: .url))
    case .embedPagesOrigin: self = .embedPagesOrigin
    }
  }

  /// Reads the body of a message the page posted.
  init(message body: Any) throws {
    guard JSONSerialization.isValidJSONObject(body) else {
      throw DecodingError.dataCorrupted(
        .init(codingPath: [], debugDescription: "the page posted something other than an object"))
    }
    let data = try JSONSerialization.data(withJSONObject: body)
    self = try JSONDecoder().decode(EditorRequest.self, from: data)
  }
}
