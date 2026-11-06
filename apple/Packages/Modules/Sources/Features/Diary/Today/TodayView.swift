import CoreEntrance
import SwiftUI

/// Today's entry, written in the editor and saved as it changes.
struct TodayView: View {
  @State private var model: TodayModel
  let files: EditorFiles
  let onLock: () -> Void

  init(diary: any Diary, files: EditorFiles, onLock: @escaping () -> Void) {
    _model = State(initialValue: TodayModel(diary: diary))
    self.files = files
    self.onLock = onLock
  }

  var body: some View {
    Group {
      switch model.reading {
      case .inProgress:
        ProgressView()
      case .read:
        EditorView(files: files, initialBody: model.initialBody) { model.changed($0) }
      case .failed(let failure):
        FailureText(failure.text)
          .padding()
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .safeAreaInset(edge: .top, spacing: 0) {
      TodayBar(day: model.day, saveMessage: model.saveMessage, locking: model.locking) {
        model.lock(then: onLock)
      }
    }
    .task { await model.load() }
  }
}

#Preview("読めない日") {
  TodayView(
    diary: FakeDiary(failure: .brokenEntry), files: EditorFiles(folder: Bundle.main.bundleURL)
  ) {}
}
