import CoreEntrance
import SwiftUI

/// The diary once the vault is open: years and months, a month's days, and
/// the day chosen. Today is written; the days before it are read only. On a
/// narrow screen the three are one stack, opened at today.
struct DiaryView: View {
  @State private var model: DiaryModel
  /// Today's entry first on a narrow screen, not the list.
  @State private var column = NavigationSplitViewColumn.detail
  private let diary: any Diary
  let host: any EntryHost
  let files: EditorFiles
  let onLock: () -> Void

  init(diary: any Diary, host: any EntryHost, files: EditorFiles, onLock: @escaping () -> Void) {
    _model = State(initialValue: DiaryModel(diary: diary))
    self.diary = diary
    self.host = host
    self.files = files
    self.onLock = onLock
  }

  var body: some View {
    NavigationSplitView(preferredCompactColumn: $column) {
      YearsView(years: model.years, failure: model.listingFailure, month: $model.month)
    } content: {
      DaysView(month: model.shownMonth, selected: $model.selected)
    } detail: {
      Group {
        if let date = model.selected {
          if date == model.today.date {
            TodayView(model: model.today, host: host, files: files)
          } else {
            PastEntryView(diary: diary, date: date, host: host, files: files)
              .id(date)
          }
        }
      }
      .navigationTitle(model.selected?.title ?? "")
      // A small title, so the entry starts near the top.
      .toolbarTitleDisplayMode(.inline)
      .safeAreaInset(edge: .top, spacing: 0) {
        SaveFailureBar(failure: model.today.saveFailure)
      }
      .toolbar {
        ToolbarItem(placement: .primaryAction) {
          Button("ロック") { model.today.lock(then: onLock) }
            .disabled(model.today.locking)
        }
      }
    }
    .task { await model.load() }
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

extension DiaryModel {
  fileprivate var listingFailure: AppError? {
    if case .failed(let failure) = listing { failure } else { nil }
  }
}

#Preview("今日") {
  DiaryView(
    diary: FakeDiary(), host: FakeEntryHost(), files: EditorFiles(folder: Bundle.main.bundleURL)
  ) {}
}

#Preview("一覧を作れない") {
  DiaryView(
    diary: FakeDiary(failure: .unexpected), host: FakeEntryHost(),
    files: EditorFiles(folder: Bundle.main.bundleURL)
  ) {}
}
