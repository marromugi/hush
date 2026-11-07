#if DEBUG
  import Foundation

  /// Keeps pictures in memory and reaches no network, for previews.
  public actor FakeEntryHost: EntryHost {
    private var images: [String: Data] = [:]

    public init() {}

    public func saveImage(_ picture: Data) async throws(AppError) -> String {
      let id = UUID().uuidString
      images[id] = picture
      return id
    }

    public func image(id: String) async throws(AppError) -> Data {
      guard let picture = images[id] else { throw .noImage }
      return picture
    }

    public func linkPage(at url: String) async throws(AppError) -> LinkPage {
      throw .link
    }

    public func linkImage(at url: String) async throws(AppError) -> Data {
      throw .link
    }

    public func embedPagesOrigin() async throws(AppError) -> String {
      throw .embedPages
    }
  }
#endif
