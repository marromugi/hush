import CoreEntrance
import SwiftUI

/// The vault's Secret Key, shown again over the diary while the vault is
/// open (`SecretKeyModal` in the Tauri app).
struct SecretKeyView: View {
  @State private var model: SecretKeyModel
  @Environment(\.dismiss) private var dismiss

  init(vault: any Vault) {
    _model = State(initialValue: SecretKeyModel(vault: vault))
  }

  var body: some View {
    NavigationStack {
      VStack(alignment: .leading, spacing: 16) {
        Text(SecretKeyCard.purpose)
        switch model.reading {
        case .inProgress:
          ProgressView()
            .frame(maxWidth: .infinity)
        case .read(let secretKey):
          SecretKeyCard(secretKey: secretKey)
        case .failed(let failure):
          FailureText(failure.text)
        }
      }
      .padding()
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .navigationTitle("Secret Key")
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("閉じる") { dismiss() }
        }
      }
    }
    .task { await model.load() }
  }
}

#Preview("読めた") {
  SecretKeyView(vault: FakeVault(status: .unlocked))
}

#Preview("この端末にない") {
  SecretKeyView(vault: FakeVault(status: .unlocked, failure: .noSecretKey))
}
