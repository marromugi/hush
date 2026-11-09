import CoreEntrance
import SwiftUI

/// Today's entry, written in the editor and saved as it changes.
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
  }
}

#Preview("読めない日") {
  @Previewable @State var model = TodayModel(diary: FakeDiary(failure: .brokenEntry))
  TodayView(
    model: model, host: FakeEntryHost(), files: EditorFiles(folder: Bundle.main.bundleURL)
  )
  .task { await model.load() }
}
