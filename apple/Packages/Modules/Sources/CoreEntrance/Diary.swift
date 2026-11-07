/// Reading and writing entries, while the vault is open.
public protocol Diary: Sendable {
  /// `nil` when nothing was written on `date`.
  func entry(on date: EntryDate) async throws(AppError) -> Entry?
  /// Stores `entry` as the one for `date`, and returns it as stored.
  func save(_ entry: Entry, on date: EntryDate) async throws(AppError) -> Entry
  /// Every date that has an entry, oldest first.
  func entryDates() async throws(AppError) -> [EntryDate]
}
