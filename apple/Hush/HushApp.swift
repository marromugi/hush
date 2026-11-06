import CoreEntrance
import Features
import Foundation
import SwiftUI

@main
struct HushApp: App {
  @State private var model = VaultModel(vault: Core(dataDirectory: .hushData))

  var body: some Scene {
    WindowGroup {
      VaultView(model: model)
    }
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
