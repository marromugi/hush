import CoreEntrance
import SwiftUI

/// A day before today, to read only. Give it an `id` of its date.
struct PastEntryView: View {
  @State private var model: PastEntryModel
  let host: any EntryHost
  let files: EditorFiles

  init(diary: any Diary, date: EntryDate, host: any EntryHost, files: EditorFiles) {
    _model = State(initialValue: PastEntryModel(diary: diary, date: date))
    self.host = host
    self.files = files
  }

  var body: some View {
    Group {
      switch model.reading {
      case .inProgress:
        ProgressView()
      case .read(let entry?):
        EditorView(files: files, host: host, content: .reader(body: entry.body))
      case .read(nil):
        Text("この日の日記はありません。")
          .foregroundStyle(.secondary)
      case .failed(let failure):
        FailureText(failure.text)
          .padding()
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .task { await model.load() }
  }
}

#Preview("読めない日") {
  PastEntryView(
    diary: FakeDiary(failure: .brokenEntry), date: EntryDate(of: .now), host: FakeEntryHost(),
    files: EditorFiles(folder: Bundle.main.bundleURL))
}

#Preview("書いていない日") {
  PastEntryView(
    diary: FakeDiary(), date: EntryDate(of: .now), host: FakeEntryHost(),
    files: EditorFiles(folder: Bundle.main.bundleURL))
}
