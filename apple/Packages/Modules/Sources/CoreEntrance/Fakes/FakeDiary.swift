#if DEBUG
  /// A diary kept in memory, for previews and tests.
  public actor FakeDiary: Diary {
    private var entries: [EntryDate: Entry]
    /// Thrown by reads and saves; `nil` lets them succeed.
    private var failure: AppError?
    /// Every entry saved, oldest first.
    public private(set) var saved: [Entry] = []

    public init(entries: [EntryDate: Entry] = [:], failure: AppError? = nil) {
      self.entries = entries
      self.failure = failure
    }

    /// Makes reads and saves throw `failure` from now on, or succeed for `nil`.
    public func fail(with failure: AppError?) {
      self.failure = failure
    }

    public func entry(on date: EntryDate) async throws(AppError) -> Entry? {
      if let failure { throw failure }
      return entries[date]
    }

    public func save(_ entry: Entry, on date: EntryDate) async throws(AppError) -> Entry {
      if let failure { throw failure }
      entries[date] = entry
      saved.append(entry)
      return entry
    }
  }
#endif
