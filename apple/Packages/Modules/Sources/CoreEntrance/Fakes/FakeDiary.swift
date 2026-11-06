#if DEBUG
  /// A diary kept in memory, for previews and tests.
  public actor FakeDiary: Diary {
    private var entries: [EntryDate: Entry]
    /// Thrown by reads and saves; `nil` lets them succeed.
    private var failure: AppError?
    /// Runs once, during the next save, before it is stored.
    private var duringNextSave: (@MainActor @Sendable () -> Void)?
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

    /// Runs `action` during the next save, as when the person types while it runs.
    public func onNextSave(_ action: @escaping @MainActor @Sendable () -> Void) {
      duringNextSave = action
    }

    public func entry(on date: EntryDate) async throws(AppError) -> Entry? {
      if let failure { throw failure }
      return entries[date]
    }

    public func save(_ entry: Entry, on date: EntryDate) async throws(AppError) -> Entry {
      if let failure { throw failure }
      if let action = duringNextSave {
        duringNextSave = nil
        await action()
      }
      entries[date] = entry
      saved.append(entry)
      return entry
    }
  }
#endif
