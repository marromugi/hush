import Foundation

/// The day an entry belongs to: the day where the person is, not in UTC.
/// Counted in the Gregorian calendar, whatever calendar the person has picked.
public struct EntryDate: Hashable, Comparable, Sendable {
  public let year: Int
  /// 1 for January.
  public let month: Int
  public let day: Int

  /// The day `instant` falls on in `timeZone`.
  public init(of instant: Date, in timeZone: TimeZone = .current) {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let parts = calendar.dateComponents([.year, .month, .day], from: instant)
    guard let year = parts.year, let month = parts.month, let day = parts.day else {
      preconditionFailure("a Gregorian date has a year, a month, and a day")
    }
    self.year = year
    self.month = month
    self.day = day
  }

  /// A date the core gives, as `YYYY-MM-DD`. The core gives only valid dates.
  init(coreText text: String) {
    let parts = text.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else {
      preconditionFailure("the core gives dates as YYYY-MM-DD, not \(text)")
    }
    year = parts[0]
    month = parts[1]
    day = parts[2]
  }

  /// `YYYY-MM-DD`, as the core takes it.
  var text: String {
    String(format: "%04d-%02d-%02d", year, month, day)
  }

  public static func < (lhs: EntryDate, rhs: EntryDate) -> Bool {
    (lhs.year, lhs.month, lhs.day) < (rhs.year, rhs.month, rhs.day)
  }
}
