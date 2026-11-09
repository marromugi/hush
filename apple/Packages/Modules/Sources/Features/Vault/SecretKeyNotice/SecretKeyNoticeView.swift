import SwiftUI

/// Shown once, right after the vault is made, so its Secret Key can be kept.
struct SecretKeyNoticeView: View {
  let secretKey: String
  let onKept: () -> Void

  var body: some View {
    VaultPage(title: "Secret Key を控えてください") {
      Text(SecretKeyCard.purpose)
      Text("なくすと、パスフレーズを覚えていても、ほかの端末では日記を開けません。")
      SecretKeyCard(secretKey: secretKey)
      Button("控えました", action: onKept)
        .buttonStyle(.borderedProminent)
    }
  }
}

#Preview {
  SecretKeyNoticeView(secretKey: "H1-ABCDE-FGHJK-MNPQR-STVWX-YZ0123") {}
}
