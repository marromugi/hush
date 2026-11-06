import CoreEntrance
import SwiftUI

/// Opens the vault on a device that does not have its Secret Key yet.
struct NewDeviceUnlockView: View {
  let busy: Bool
  let failure: AppError?
  /// Takes the passphrase, then the Secret Key.
  let onUnlock: (String, String) -> Void
  @State private var secretKey = ""
  @State private var passphrase = ""

  var body: some View {
    VaultPage(title: "この端末で日記帳を開く") {
      Text("はじめての端末では、パスフレーズと一緒に Secret Key が要ります。")
      LabeledField("Secret Key", failure: failure?.text(at: .secretKeyField)) {
        TextField("Secret Key", text: $secretKey)
          .autocorrectionDisabled()
          #if os(iOS)
            // A Secret Key is letters and digits; a kana keyboard would turn them into kana.
            .keyboardType(.asciiCapable)
            .textInputAutocapitalization(.characters)
          #endif
      }
      LabeledField("パスフレーズ", failure: failure?.text(at: .passphraseField)) {
        SecureField("パスフレーズ", text: $passphrase)
      }
      if let text = failure?.text(at: .bothFields) ?? failure?.text(at: .wholeForm) {
        FailureText(text)
      }
      Button("開く") { onUnlock(passphrase, secretKey) }
        .buttonStyle(.borderedProminent)
        .disabled(busy)
    }
    .onSubmit { onUnlock(passphrase, secretKey) }
  }
}

#Preview("はじめ") {
  NewDeviceUnlockView(busy: false, failure: nil) { _, _ in }
}

#Preview("開いている途中") {
  NewDeviceUnlockView(busy: true, failure: nil) { _, _ in }
}

#Preview("Secret Key の形が違う") {
  NewDeviceUnlockView(busy: false, failure: .invalidSecretKey) { _, _ in }
}

#Preview("パスフレーズが違う") {
  NewDeviceUnlockView(busy: false, failure: .wrongPassphrase) { _, _ in }
}

#Preview("どちらかが違う") {
  NewDeviceUnlockView(busy: false, failure: .wrongPassphraseOrSecretKey) { _, _ in }
}

#Preview("Secret Key がなくなった") {
  NewDeviceUnlockView(busy: false, failure: .noSecretKey) { _, _ in }
}
