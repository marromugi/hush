import CoreEntrance
import SwiftUI

/// The top of the diary: how saving today's entry stands, at the right.
/// Always as tall as one line, so the entry does not move down as the first
/// save starts.
struct DiaryHeader: View {
  let saveMessage: TodayModel.SaveMessage?

  var body: some View {
    (saveMessage?.text ?? Text(verbatim: " "))
      .font(.footnote)
      .foregroundStyle(.secondary)
      .frame(maxWidth: .infinity, alignment: .trailing)
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
  DiaryHeader(saveMessage: .saved)
}

#Preview("保存できませんでした") {
  DiaryHeader(saveMessage: .failed(.unexpected))
}

#Preview("まだ何も保存していない") {
  DiaryHeader(saveMessage: nil)
}
