import CoreEntrance
import SwiftUI

/// The screen for where the vault stands.
public struct VaultView: View {
  let model: VaultModel

  public init(model: VaultModel) {
    self.model = model
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
          UnlockedView(onLock: model.lock)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .task { await model.load() }
  }
}

#Preview("日記帳がない") {
  VaultView(model: VaultModel(vault: FakeVault(status: .missing)))
}

#Preview("ロック中") {
  VaultView(model: VaultModel(vault: FakeVault(status: .locked)))
}
