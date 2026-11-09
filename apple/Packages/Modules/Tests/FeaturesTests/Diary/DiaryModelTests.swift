import CoreEntrance
import Foundation
import Testing

@testable import Features

struct DiaryModelTests {
  @Test func todayIsShownAtFirstAndListedEvenBeforeAnythingIsWritten() async throws {
    let day = try Date("2026-11-07T12:00:00Z", strategy: .iso8601)
    let today = EntryDate(of: day)
    let past = try entryDate("2026-10-31")
    let model = DiaryModel(diary: FakeDiary(entries: [past: Entry(body: "<p>雪</p>")]), day: day)

    await model.load()

    #expect(model.selected == today)
    #expect(model.years.flatMap(\.months).flatMap(\.days) == [past, today])
  }

  @Test func todayIsListedOnceWhenItHasAnEntry() async {
    let today = EntryDate(of: .now)
    let model = DiaryModel(diary: FakeDiary(entries: [today: Entry(body: "<p>雪</p>")]))

    await model.load()

    #expect(model.years.flatMap(\.months).flatMap(\.days) == [today])
  }

  @Test func whenTheDaysCannotBeListedOnlyTodayIs() async {
    let model = DiaryModel(diary: FakeDiary(failure: .unexpected))

    await model.load()

    #expect(model.listingFailure == .unexpected)
    #expect(model.years.flatMap(\.months).flatMap(\.days) == [EntryDate(of: .now)])
  }
}
