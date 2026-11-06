import Foundation

/// The day an entry belongs to: the day where the person is, not in UTC.
public struct EntryDate: Hashable, Sendable {
  /// `YYYY-MM-DD`, as the core takes it.
  let text: String

  /// The day `instant` falls on in `timeZone`. Counted in the Gregorian
  /// calendar, whatever calendar the person has picked.
  public init(of instant: Date, in timeZone: TimeZone = .current) {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let parts = calendar.dateComponents([.year, .month, .day], from: instant)
    guard let year = parts.year, let month = parts.month, let day = parts.day else {
      preconditionFailure("a Gregorian date has a year, a month, and a day")
    }
    text = String(format: "%04d-%02d-%02d", year, month, day)
  }
}
