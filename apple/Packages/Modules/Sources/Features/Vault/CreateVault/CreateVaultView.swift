import CoreEntrance
import SwiftUI

struct CreateVaultView: View {
  let busy: Bool
  let failure: AppError?
  let onCreate: (String) -> Void
  @State private var form: CreateVaultForm

  init(
    busy: Bool,
    failure: AppError?,
    form: CreateVaultForm = CreateVaultForm(),
    onCreate: @escaping (String) -> Void
  ) {
    self.busy = busy
    self.failure = failure
    self.onCreate = onCreate
    _form = State(initialValue: form)
  }

  var body: some View {
    let failure = form.shown(failure)
    VaultPage(title: "日記帳を作る") {
      Text("パスフレーズを忘れると、日記は二度と開けません。")
      LabeledField("パスフレーズ", failure: failure?.text(at: .passphraseField)) {
        SecureField("パスフレーズ", text: $form.passphrase)
      }
      LabeledField("もう一度", failure: form.mismatched ? "パスフレーズが一致しません。" : nil) {
        SecureField("もう一度", text: $form.confirm)
      }
      if let text = failure?.text(at: .wholeForm) {
        FailureText(text)
      }
      Button("作る") { form.submit(busy: busy, create: onCreate) }
        .buttonStyle(.borderedProminent)
        .disabled(busy)
    }
    .onSubmit { form.submit(busy: busy, create: onCreate) }
  }
}

#Preview("はじめ") {
  CreateVaultView(busy: false, failure: nil) { _ in }
}

#Preview("作っている途中") {
  CreateVaultView(busy: true, failure: nil) { _ in }
}

#Preview("パスフレーズが空") {
  CreateVaultView(busy: false, failure: .emptyPassphrase) { _ in }
}

#Preview("パスフレーズが一致しない") {
  let form = CreateVaultForm(passphrase: "a", confirm: "b")
  form.submit(busy: false) { _ in }
  return CreateVaultView(busy: false, failure: nil, form: form) { _ in }
}

#Preview("ほかの失敗") {
  CreateVaultView(busy: false, failure: .keychain) { _ in }
}
