import CoreEntrance
import SwiftUI

/// The day shown, between how saving today's entry stands and the day's
/// date. Today is written; a day before it is read only.
struct DayPage: View {
  let model: DiaryModel
  let diary: any Diary
  let host: any EntryHost
  let files: EditorFiles
  /// MENU is shown only with this.
  let onMenu: (() -> Void)?

  var body: some View {
    Group {
      if model.selected == model.today.date {
        TodayView(model: model.today, host: host, files: files)
      } else {
        PastEntryView(diary: diary, date: model.selected, host: host, files: files)
          .id(model.selected)
      }
    }
    .safeAreaInset(edge: .top, spacing: 0) {
      VStack(spacing: 0) {
        DiaryHeader(saveMessage: model.today.saveMessage, onMenu: onMenu)
        SaveFailureBar(failure: model.today.saveFailure)
      }
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      DiaryFooter(date: model.selected)
        .hiddenUnderKeyboard()
    }
    // The footer stays at the foot, behind the keyboard: WebKit keeps the
    // cursor clear of the keyboard, but not of a bar riding on top of it.
    .ignoresSafeArea(.keyboard)
  }
}

/// Why today's entry was not saved, until a save succeeds. Shown on every
/// day, since the lock waits for that save.
private struct SaveFailureBar: View {
  let failure: AppError?

  var body: some View {
    if let failure {
      FailureText(failure.text)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.bar)
    }
  }
}

#Preview("過去の日") {
  let yesterday = EntryDate(of: .now.addingTimeInterval(-24 * 60 * 60))
  let diary = FakeDiary(entries: [yesterday: Entry(body: "<p>雪</p>")])
  let model = DiaryModel(diary: diary)
  let _ = model.select(yesterday)
  DayPage(
    model: model, diary: diary, host: FakeEntryHost(),
    files: EditorFiles(folder: Bundle.main.bundleURL)
  ) {}
}
