import Foundation
import Testing

@testable import CoreEntrance

struct EntryDateTests {
  @Test(arguments: [("Asia/Tokyo", "2026-11-07"), ("America/Los_Angeles", "2026-11-06")])
  func theDayIsTheOneWhereThePersonIs(zone: String, day: String) throws {
    let instant = try Date("2026-11-06T15:30:00Z", strategy: .iso8601)
    let timeZone = try #require(TimeZone(identifier: zone))
    #expect(EntryDate(of: instant, in: timeZone).text == day)
  }
}
