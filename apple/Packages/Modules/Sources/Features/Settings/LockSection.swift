import CoreEntrance
import SwiftUI

/// Whether this device opens the vault with Touch ID or Face ID as well as
/// the passphrase (`LockSection` in the Tauri app).
struct LockSection: View {
  /// `nil` until read.
  let status: BiometryStatus?
  let busy: Bool
  let failure: AppError?
  let onChange: (Bool) -> Void

  var body: some View {
    Section("ロック") {
      if let status {
        if let biometry = status.biometry {
          Toggle(
            "\(biometry.name) でも開く",
            isOn: Binding(get: { status.isOn }, set: { onChange($0) })
          )
          .disabled(busy)
          Text(
            "この端末だけの設定です。\(biometry.name) でも開けるようにすると、この端末と \(biometry.name) で日記帳を開けます。パスフレーズは、\(biometry.name) で開けないときに使います。"
          )
          .font(.footnote)
          .foregroundStyle(.secondary)
        } else {
          Text("この端末では、日記帳はパスフレーズで開きます。Touch ID や Face ID が使える端末では、それでも開けるようにできます。")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
      if let failure {
        FailureText(failure.text)
      }
    }
  }
}

#Preview("Touch ID がある") {
  Form {
    LockSection(
      status: BiometryStatus(biometry: .touchID, isOn: true), busy: false, failure: nil
    ) { _ in }
  }
}

#Preview("Touch ID も Face ID もない") {
  Form {
    LockSection(status: BiometryStatus(biometry: nil, isOn: false), busy: false, failure: nil) {
      _ in
    }
  }
}

#Preview("切り替えられない") {
  Form {
    LockSection(
      status: BiometryStatus(biometry: .faceID, isOn: false), busy: false,
      failure: .biometricKeychain
    ) { _ in }
  }
}
