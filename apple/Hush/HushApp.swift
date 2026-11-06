import CoreEntrance
import Features
import Foundation
import SwiftUI

@main
struct HushApp: App {
  /// One for the app, shared by the vault and the diary: the open vault's key lives in it.
  private let core: Core
  @State private var model: VaultModel

  init() {
    let core = Core(dataDirectory: .hushData)
    self.core = core
    _model = State(initialValue: VaultModel(vault: core))
  }

  var body: some Scene {
    // One window on the Mac too: two editors on one entry would save over each other.
    #if os(macOS)
      Window("Hush Swift", id: "diary") { root }
    #else
      WindowGroup { root }
    #endif
  }

  private var root: some View {
    VaultView(model: model, diary: core, editorFiles: .inApp)
  }
}

extension URL {
  /// Its own folder, apart from the Tauri app's, since both may run on one Mac.
  fileprivate static var hushData: URL {
    guard let id = Bundle.main.bundleIdentifier else {
      preconditionFailure("the app bundle has an identifier")
    }
    return URL.applicationSupportDirectory.appending(path: id, directoryHint: .isDirectory)
  }
}

extension EditorFiles {
  /// The web pages bundled by `apple/scripts/build-web.sh`.
  fileprivate static var inApp: EditorFiles {
    guard let folder = Bundle.main.url(forResource: "Web", withExtension: nil) else {
      preconditionFailure("the app bundles the web pages; run apple/scripts/build-web.sh")
    }
    return EditorFiles(folder: folder)
  }
}
