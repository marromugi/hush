import CoreEntrance
import SwiftUI

/// Opens the vault on a device that has its Secret Key.
struct UnlockView: View {
  let busy: Bool
  let failure: AppError?
  let onUnlock: (String) -> Void
  @State private var passphrase = ""

  var body: some View {
    VaultPage(title: "日記帳を開く") {
      LabeledField("パスフレーズ", failure: failure?.text(at: .passphraseField)) {
        SecureField("パスフレーズ", text: $passphrase)
      }
      if let text = failure?.text(at: .wholeForm) {
        FailureText(text)
      }
      Button("開く") { onUnlock(passphrase) }
        .buttonStyle(.borderedProminent)
        .disabled(busy)
    }
    .onSubmit { onUnlock(passphrase) }
  }
}

#Preview("はじめ") {
  UnlockView(busy: false, failure: nil) { _ in }
}

#Preview("開いている途中") {
  UnlockView(busy: true, failure: nil) { _ in }
}

#Preview("パスフレーズが違う") {
  UnlockView(busy: false, failure: .wrongPassphrase) { _ in }
}

#Preview("ほかの失敗") {
  UnlockView(busy: false, failure: .brokenVault) { _ in }
}
