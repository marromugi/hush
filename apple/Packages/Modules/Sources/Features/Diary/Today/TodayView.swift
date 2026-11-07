import CoreEntrance
import SwiftUI

/// Today's entry, written in the editor and saved as it changes. How saving
/// stands is said under the day's title.
struct TodayView: View {
  let model: TodayModel
  let host: any EntryHost
  let files: EditorFiles

  var body: some View {
    Group {
      switch model.reading {
      case .inProgress:
        ProgressView()
      case .read:
        EditorView(
          files: files, host: host,
          content: .editor(initialBody: model.initialBody) { model.changed($0) })
      case .failed(let failure):
        FailureText(failure.text)
          .padding()
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .saveMessage(model.saveMessage?.subtitle)
  }
}

extension View {
  /// How saving stands: under the day's title where the system has room for
  /// it, and before iOS 26 in a strip above the entry.
  @ViewBuilder
  fileprivate func saveMessage(_ text: Text?) -> some View {
    if #available(iOS 26, *) {
      navigationSubtitle(text ?? Text(verbatim: ""))
    } else {
      safeAreaInset(edge: .top, spacing: 0) {
        if let text {
          text
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
            .background(.bar)
        }
      }
    }
  }
}

extension TodayModel.SaveMessage {
  /// A failure's reason is shown apart, above the entry.
  fileprivate var subtitle: Text {
    switch self {
    case .saving: Text("保存中…")
    case .saved: Text("保存しました")
    case .failed: Text("保存できませんでした")
    }
  }
}

#Preview("読めない日") {
  @Previewable @State var model = TodayModel(diary: FakeDiary(failure: .brokenEntry))
  NavigationStack {
    TodayView(
      model: model, host: FakeEntryHost(), files: EditorFiles(folder: Bundle.main.bundleURL)
    )
    .task { await model.load() }
  }
}
