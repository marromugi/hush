import CoreEntrance
import SwiftUI

struct VaultStatusView: View {
  let status: VaultStatus?

  var body: some View {
    Group {
      if let status {
        Text(status.title)
      } else {
        ProgressView()
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

extension VaultStatus {
  fileprivate var title: LocalizedStringKey {
    switch self {
    case .missing: "金庫がまだありません"
    case .needsSecretKey: "この端末には Secret Key がありません"
    case .locked: "ロックしています"
    case .unlocked: "開いています"
    }
  }
}

#Preview("読み込み中") {
  VaultStatusView(status: nil)
}

#Preview("金庫なし") {
  VaultStatusView(status: .missing)
}

#Preview("Secret Key なし") {
  VaultStatusView(status: .needsSecretKey)
}

#Preview("ロック中") {
  VaultStatusView(status: .locked)
}

#Preview("開いている") {
  VaultStatusView(status: .unlocked)
}
