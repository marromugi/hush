import CoreEntrance
import SwiftUI

/// The top of the diary: MENU at the left, and how saving today's entry
/// stands at the right. Always as tall as one line, so the entry does not
/// move down as the first save starts.
struct DiaryHeader: View {
  let saveMessage: TodayModel.SaveMessage?
  /// MENU is shown only with this: a wide screen keeps the menu beside the
  /// day instead.
  let onMenu: (() -> Void)?

  var body: some View {
    HStack(alignment: .firstTextBaseline) {
      if let onMenu {
        Button(action: onMenu) {
          Label("MENU", systemImage: "line.3.horizontal")
            .labelStyle(.titleAndIcon)
            .font(.subheadline.weight(.semibold))
            .tracking(1)
            // A wider tap area than the label, without moving it.
            .padding(8)
            .contentShape(.rect)
            .padding(-8)
        }
        .buttonStyle(.plain)
      }
      Spacer(minLength: 16)
      (saveMessage?.text ?? Text(verbatim: " "))
        .font(.footnote)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.trailing)
    }
    .padding(.horizontal, 20)
    .padding(.vertical, 12)
  }
}

extension TodayModel.SaveMessage {
  /// A failure's reason is shown apart, under the header.
  fileprivate var text: Text {
    switch self {
    case .saving: Text("保存中…")
    case .saved: Text("保存しました")
    case .failed: Text("保存できませんでした")
    }
  }
}

#Preview("保存しました") {
  DiaryHeader(saveMessage: .saved) {}
}

#Preview("保存できませんでした") {
  DiaryHeader(saveMessage: .failed(.unexpected)) {}
}

#Preview("まだ何も保存していない") {
  DiaryHeader(saveMessage: nil) {}
}

#Preview("広い画面") {
  DiaryHeader(saveMessage: .saved, onMenu: nil)
}
