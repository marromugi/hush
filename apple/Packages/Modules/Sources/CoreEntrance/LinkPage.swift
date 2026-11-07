internal import CoreBindings

/// What a card shows of the page a link points at.
public struct LinkPage: Equatable, Sendable {
  /// `nil` when the page names no title.
  public var title: String?
  /// The page's picture, as an absolute URL; `nil` when it names none.
  public var imageURL: String?

  public init(title: String?, imageURL: String?) {
    self.title = title
    self.imageURL = imageURL
  }
}

extension LinkPage {
  init(_ page: CoreBindings.LinkPage) {
    self.init(title: page.title, imageURL: page.imageUrl)
  }
}
