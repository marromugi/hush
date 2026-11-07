import CoreEntrance
import SwiftUI

/// The screen for where the vault stands.
public struct VaultView: View {
  let model: VaultModel
  let diary: any Diary
  let entryHost: any EntryHost
  let editorFiles: EditorFiles

  /// `diary`, `entryHost`, and `editorFiles` are for the diary shown once
  /// the vault is open.
  public init(
    model: VaultModel, diary: any Diary, entryHost: any EntryHost, editorFiles: EditorFiles
  ) {
    self.model = model
    self.diary = diary
    self.entryHost = entryHost
    self.editorFiles = editorFiles
  }

  public var body: some View {
    Group {
      switch model.status {
      case nil:
        ProgressView()
      case .missing:
        CreateVaultView(busy: model.busy, failure: model.failure) { model.create(passphrase: $0) }
      case .needsSecretKey:
        NewDeviceUnlockView(busy: model.busy, failure: model.failure) {
          model.unlock(passphrase: $0, secretKey: $1)
        }
      case .locked:
        UnlockView(busy: model.busy, failure: model.failure) { model.unlock(passphrase: $0) }
      case .unlocked:
        if let secretKey = model.newSecretKey {
          SecretKeyNoticeView(secretKey: secretKey, onKept: model.keptSecretKey)
        } else {
          TodayView(diary: diary, host: entryHost, files: editorFiles, onLock: model.lock)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .task { await model.load() }
  }
}

#Preview("日記帳がない") {
  VaultView(
    model: VaultModel(vault: FakeVault(status: .missing)), diary: FakeDiary(),
    entryHost: FakeEntryHost(), editorFiles: EditorFiles(folder: Bundle.main.bundleURL))
}

#Preview("ロック中") {
  VaultView(
    model: VaultModel(vault: FakeVault(status: .locked)), diary: FakeDiary(),
    entryHost: FakeEntryHost(), editorFiles: EditorFiles(folder: Bundle.main.bundleURL))
}
