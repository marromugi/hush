import CoreEntrance
import Foundation
import Testing

@testable import Features

struct CalendarOfTests {
  @Test func theNewestYearComesFirstAndMonthsAndDaysRunOldestFirst() throws {
    let dates = try ["2025-12-31", "2026-01-02", "2026-01-15", "2026-03-01"].map(entryDate)

    let years = calendar(of: dates)

    #expect(years.map(\.year) == [2026, 2025])
    #expect(years[0].months.map(\.id.month) == [1, 3])
    #expect(years[0].months[0].days == [dates[1], dates[2]])
    #expect(years[1].months.map(\.id.month) == [12])
  }
}

/// The day `text` (`YYYY-MM-DD`) names, counted in UTC.
func entryDate(_ text: String) throws -> EntryDate {
  EntryDate(of: try Date("\(text)T12:00:00Z", strategy: .iso8601), in: .gmt)
}
