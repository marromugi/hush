internal import CoreBindings

/// One day's entry, as it is stored.
public struct Entry: Equatable, Sendable {
  /// The body as HTML.
  public var body: String
  /// `nil` shows the entry in the reader's default font.
  public var font: EntryFont?

  public init(body: String, font: EntryFont? = nil) {
    self.body = body
    self.font = font
  }
}

/// The font an entry is shown in. The screens only carry it, so that saving
/// keeps the font the entry has.
public struct EntryFont: Equatable, Sendable {
  public var id: String
  public var family: String
  public var category: String
  public var stylesheet: String

  public init(id: String, family: String, category: String, stylesheet: String) {
    self.id = id
    self.family = family
    self.category = category
    self.stylesheet = stylesheet
  }
}

extension Entry {
  init(_ entry: EntryView) {
    self.init(body: entry.body, font: entry.font.map(EntryFont.init))
  }
}

extension EntryFont {
  init(_ font: CoreBindings.EntryFont) {
    self.init(
      id: font.id, family: font.family, category: font.category, stylesheet: font.stylesheet)
  }
}

extension CoreBindings.EntryFont {
  init(_ font: EntryFont) {
    self.init(
      id: font.id, family: font.family, category: font.category, stylesheet: font.stylesheet)
  }
}
