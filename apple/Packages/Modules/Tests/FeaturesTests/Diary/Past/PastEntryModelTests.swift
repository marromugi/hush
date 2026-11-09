import CoreEntrance
import Testing

@testable import Features

struct PastEntryModelTests {
  @Test func aDayIsShownAsStored() async throws {
    let date = try entryDate("2026-10-31")
    let entry = Entry(body: "<p>雪</p>")
    let model = PastEntryModel(diary: FakeDiary(entries: [date: entry]), date: date)

    await model.load()

    #expect(model.reading == .read(entry))
  }

  @Test func aDayThatCannotBeReadSaysWhy() async throws {
    let date = try entryDate("2026-10-31")
    let model = PastEntryModel(diary: FakeDiary(failure: .brokenEntry), date: date)

    await model.load()

    #expect(model.reading == .failed(.brokenEntry))
  }
}
