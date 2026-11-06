import SwiftUI

/// What is shown while the vault is open, until the diary has a screen.
struct UnlockedView: View {
  let onLock: () -> Void

  var body: some View {
    VaultPage(title: "日記帳を開いています") {
      Text("日記の画面は、まだありません。")
      Button("ロック", action: onLock)
    }
  }
}

#Preview {
  UnlockedView {}
}
