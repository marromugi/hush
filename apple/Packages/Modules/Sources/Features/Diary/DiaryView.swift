import CoreEntrance
import SwiftUI

/// The diary once the vault is open: today's entry, written in the editor,
/// with how saving stands above it and the day below it. The days before
/// today, the settings, and the lock button are not shown yet; the vault
/// still locks when the diary is left unattended.
struct DiaryView: View {
  @State private var model: DiaryModel
  private let vault: any Vault
  private let diary: any Diary
  let host: any EntryHost
  let files: EditorFiles
  let onLock: () -> Void

  /// `vault` is for the settings.
  init(
    vault: any Vault, diary: any Diary, host: any EntryHost, files: EditorFiles,
    onLock: @escaping () -> Void
  ) {
    _model = State(initialValue: DiaryModel(diary: diary))
    self.vault = vault
    self.diary = diary
    self.host = host
    self.files = files
    self.onLock = onLock
  }

  var body: some View {
    TodayView(model: model.today, host: host, files: files)
      .safeAreaInset(edge: .top, spacing: 0) {
        VStack(spacing: 0) {
          DiaryHeader(saveMessage: model.today.saveMessage)
          SaveFailureBar(failure: model.today.saveFailure)
        }
      }
      .safeAreaInset(edge: .bottom, spacing: 0) {
        DiaryFooter(date: model.today.date)
      }
      // The footer stays at the foot, behind the keyboard: WebKit keeps the
      // cursor clear of the keyboard, but not of a bar riding on top of it.
      .ignoresSafeArea(.keyboard)
      .background(Color.page)
      .task { await model.load() }
      .lockWhenLeftUnattended { model.today.lock(then: onLock) }
  }
}

/// Why today's entry was not saved, until a save succeeds.
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

#Preview("今日") {
  DiaryView(
    vault: FakeVault(status: .unlocked), diary: FakeDiary(), host: FakeEntryHost(),
    files: EditorFiles(folder: Bundle.main.bundleURL)
  ) {}
}

#Preview("読めない日") {
  DiaryView(
    vault: FakeVault(status: .unlocked), diary: FakeDiary(failure: .brokenEntry),
    host: FakeEntryHost(),
    files: EditorFiles(folder: Bundle.main.bundleURL)
  ) {}
}
