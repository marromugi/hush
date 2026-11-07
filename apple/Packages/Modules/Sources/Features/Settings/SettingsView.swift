import CoreEntrance
import SwiftUI

/// The settings, shown over the diary while the vault is open.
struct SettingsView: View {
  @State private var model: LockSettingsModel
  @Environment(\.dismiss) private var dismiss

  init(vault: any Vault) {
    _model = State(initialValue: LockSettingsModel(vault: vault))
  }

  var body: some View {
    NavigationStack {
      Form {
        LockSection(status: model.status, busy: model.busy, failure: model.failure) {
          model.setOn($0)
        }
      }
      .navigationTitle("設定")
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("閉じる") { dismiss() }
        }
      }
    }
    .task { await model.load() }
  }
}

#Preview {
  SettingsView(
    vault: FakeVault(status: .unlocked, biometry: BiometryStatus(biometry: .touchID, isOn: false))
  )
}
