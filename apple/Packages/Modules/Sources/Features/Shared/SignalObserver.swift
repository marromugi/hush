import Foundation

/// Turns a notification into a call, for the centres that take a selector.
/// The centres hold it weakly: it is heard for as long as its owner keeps it.
final class SignalObserver: NSObject {
  private let onPost: @Sendable () -> Void

  init(_ onPost: @escaping @Sendable () -> Void) {
    self.onPost = onPost
  }

  @objc func post(_ notification: Notification) {
    onPost()
  }
}
