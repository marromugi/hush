import CoreEntrance
import Foundation
import Testing

@testable import Features

struct TodayModelTests {
  let day = Date.now

  var today: EntryDate { EntryDate(of: day) }

  /// Waits long enough that a test only saves when it says so.
  func model(_ diary: FakeDiary, saveDelay: Duration = .seconds(60)) -> TodayModel {
    TodayModel(diary: diary, day: day, saveDelay: saveDelay)
  }

  @Test func theEditorStartsWithWhatIsStoredForTheDay() async {
    let model = model(FakeDiary(entries: [today: Entry(body: "<p>雪</p>")]))
    await model.load()

    #expect(model.reading == .read)
    #expect(model.initialBody == "<p>雪</p>")
    #expect(model.saveMessage == .saved)
  }

  @Test func aDayWithNothingWrittenSavesNothingUntilSomethingIsTyped() async {
    let diary = FakeDiary()
    let model = model(diary)
    await model.load()

    #expect(model.initialBody == "")
    #expect(model.saveMessage == nil)
    #expect(await model.save())
    #expect(await diary.saved.isEmpty)
  }

  @Test func anEntryThatCannotBeReadShowsNoEditor() async {
    let model = model(FakeDiary(failure: .brokenEntry))
    await model.load()

    #expect(model.reading == .failed(.brokenEntry))
  }

  @Test func typingIsSavedOnceItPauses() async {
    let diary = FakeDiary()
    let model = model(diary, saveDelay: .zero)
    await model.load()

    await model.changed("<p>海</p>").value
    #expect(await diary.saved == [Entry(body: "<p>海</p>")])
    #expect(model.saveMessage == .saved)
  }

  @Test func onlyTheNewestBodyIsSaved() async {
    let diary = FakeDiary()
    let model = model(diary)
    await model.load()

    let first = model.changed("<p>海</p>")
    model.changed("<p>海辺</p>")
    await first.value
    #expect(await diary.saved.isEmpty)
    #expect(model.saveMessage == .saving)

    await model.save()
    #expect(await diary.saved == [Entry(body: "<p>海辺</p>")])
  }

  @Test func aBodyThatIsStoredAlreadyIsNotSavedAgain() async {
    let diary = FakeDiary(entries: [today: Entry(body: "<p>雪</p>")])
    let model = model(diary, saveDelay: .zero)
    await model.load()

    await model.changed("<p>雪</p>").value
    #expect(await diary.saved.isEmpty)
  }

  @Test func savingKeepsTheFontTheEntryHas() async {
    let font = EntryFont(
      id: "klee", family: "Klee One", category: "handwriting", stylesheet: "klee.css")
    let diary = FakeDiary(entries: [today: Entry(body: "<p>雪</p>", font: font)])
    let model = model(diary, saveDelay: .zero)
    await model.load()

    await model.changed("<p>雪国</p>").value
    #expect(await diary.saved == [Entry(body: "<p>雪国</p>", font: font)])
  }

  @Test func aFailedSaveSaysSoAndIsTriedAgain() async {
    let diary = FakeDiary()
    let model = model(diary, saveDelay: .zero)
    await model.load()
    await diary.fail(with: .unexpected)

    await model.changed("<p>海</p>").value
    #expect(model.saveMessage == .failed(.unexpected))

    await diary.fail(with: nil)
    #expect(await model.save())
    #expect(await diary.saved == [Entry(body: "<p>海</p>")])
    #expect(model.saveMessage == .saved)
  }

  @Test func theVaultLocksOnceTheNewestBodyIsSaved() async {
    let diary = FakeDiary()
    let model = model(diary)
    await model.load()
    model.changed("<p>海</p>")

    var locked = false
    await model.lock { locked = true }.value
    #expect(locked)
    #expect(await diary.saved == [Entry(body: "<p>海</p>")])
  }

  @Test func textTypedWhileTheLockSavesIsSavedBeforeTheVaultLocks() async {
    let diary = FakeDiary()
    let model = model(diary)
    await model.load()
    model.changed("<p>海</p>")
    await diary.onNextSave { model.changed("<p>海辺</p>") }

    var locked = false
    await model.lock { locked = true }.value
    #expect(locked)
    #expect(await diary.saved == [Entry(body: "<p>海</p>"), Entry(body: "<p>海辺</p>")])
  }

  @Test func aFailedSaveKeepsTheVaultOpen() async {
    let diary = FakeDiary()
    let model = model(diary)
    await model.load()
    await diary.fail(with: .unexpected)
    model.changed("<p>海</p>")

    var locked = false
    await model.lock { locked = true }.value
    #expect(!locked)
    #expect(!model.locking)
    #expect(model.saveMessage == .failed(.unexpected))
  }
}
