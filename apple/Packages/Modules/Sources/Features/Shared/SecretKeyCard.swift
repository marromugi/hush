import SwiftUI

/// A Secret Key, set apart in a box and selectable, to be copied or written
/// down.
struct SecretKeyCard: View {
  let secretKey: String

  var body: some View {
    Text(verbatim: secretKey)
      .font(.system(.title3, design: .monospaced))
      .textSelection(.enabled)
      .padding()
      .frame(maxWidth: .infinity, alignment: .leading)
      .overlay(RoundedRectangle(cornerRadius: 8).stroke(.separator))
  }
}

extension SecretKeyCard {
  /// What a Secret Key is for, said wherever one is shown.
  static let purpose: LocalizedStringKey = "ほかの端末で日記帳を開くときに、パスフレーズと一緒に要ります。"
}

#Preview {
  SecretKeyCard(secretKey: "H1-ABCDE-FGHJK-MNPQR-STVWX-YZ0123")
    .padding()
}
