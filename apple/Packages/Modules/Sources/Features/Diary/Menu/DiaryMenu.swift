import CoreEntrance
import SwiftUI

/// The menu beside the diary: the days to choose from, and the settings and
/// the lock at its foot (`Sidebar` and `ConfigList` in the Tauri app). Only
/// the days scroll, so the settings and the lock stay in view.
struct DiaryMenu: View {
  let years: [CalendarYear]
  /// Why the days could not be listed; only today is listed then.
  let failure: AppError?
  let selected: EntryDate
  /// True from asking to lock until the vault locks or the save fails.
  let locking: Bool
  let onChoose: (EntryDate) -> Void
  let onSettings: () -> Void
  let onLock: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 24) {
      ScrollView {
        VStack(alignment: .leading, spacing: 12) {
          DateList(years: years, selected: selected, onChoose: onChoose)
          if let failure {
            FailureText(failure.text)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .scrollBounceBehavior(.basedOnSize)
      VStack(alignment: .leading, spacing: 0) {
        Button("設定", action: onSettings)
        Button("ロック", action: onLock)
          .disabled(locking)
      }
      .buttonStyle(.menuRow)
    }
    .padding(.horizontal, 20)
    .padding(.vertical, 16)
  }
}

#Preview("日記がある") {
  let today = EntryDate(of: .now)
  let lastYear = EntryDate(of: .now.addingTimeInterval(-366 * 24 * 60 * 60))
  DiaryMenu(
    years: calendar(of: [lastYear, today]), failure: nil, selected: today, locking: false,
    onChoose: { _ in }, onSettings: {}, onLock: {})
}

#Preview("一覧を作れない") {
  let today = EntryDate(of: .now)
  DiaryMenu(
    years: calendar(of: [today]), failure: .unexpected, selected: today, locking: false,
    onChoose: { _ in }, onSettings: {}, onLock: {})
}

#Preview("ロック中") {
  let today = EntryDate(of: .now)
  DiaryMenu(
    years: calendar(of: [today]), failure: nil, selected: today, locking: true,
    onChoose: { _ in }, onSettings: {}, onLock: {})
}
