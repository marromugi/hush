import Foundation

/// What the app does for an entry's page while the vault is open: keeping
/// its pictures, reading the pages its links point at, and serving the pages
/// its videos play in (`EntryHost` on the web side).
public protocol EntryHost: Sendable {
  /// Saves `picture`, a JPEG, PNG, or GIF, as a new encrypted image, and
  /// returns its id.
  func saveImage(_ picture: Data) async throws(AppError) -> String
  /// The picture saved as `id`.
  func image(id: String) async throws(AppError) -> Data
  /// Reads the page at `url`, an `http` or `https` link, for its title and picture.
  func linkPage(at url: String) async throws(AppError) -> LinkPage
  /// The picture at `url`, in whatever format the site sent it.
  func linkImage(at url: String) async throws(AppError) -> Data
  /// Where the pages YouTube videos are shown in are served from, as
  /// `http://127.0.0.1:{port}`.
  func embedPagesOrigin() async throws(AppError) -> String
}
