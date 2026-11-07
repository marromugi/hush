import SwiftUI

#if os(macOS)
  import AppKit
#endif

extension View {
  /// Calls `lock` when the system would leave the diary on an unattended
  /// screen, as the Tauri app does: on iOS as soon as the app is no longer
  /// active, Control Center and the app switcher included; on the Mac when it
  /// sleeps or locks the screen, not when another app comes to the front.
  func lockWhenLeftUnattended(_ lock: @escaping () -> Void) -> some View {
    modifier(LockSignals(lock: lock))
  }
}

private struct LockSignals: ViewModifier {
  let lock: () -> Void

  #if os(iOS)
    @Environment(\.scenePhase) private var phase

    func body(content: Content) -> some View {
      content.onChange(of: phase) { _, phase in
        if phase != .active { lock() }
      }
    }
  #else
    func body(content: Content) -> some View {
      content.task {
        for await _ in screenLeftUnattended() { lock() }
      }
    }
  #endif
}

#if os(macOS)
  /// Each time the Mac goes to sleep or locks its screen, until the
  /// sequence is no longer read.
  private func screenLeftUnattended() -> AsyncStream<Void> {
    AsyncStream { continuation in
      let observer = SignalObserver { continuation.yield() }
      NSWorkspace.shared.notificationCenter.addObserver(
        observer, selector: #selector(SignalObserver.post), name: NSWorkspace.willSleepNotification,
        object: nil)
      // Not in Apple's headers, but posted on every screen lock. AppKit holds
      // distributed notifications back while the app is in the background
      // unless asked not to; a screen locked over another app must still
      // lock the diary.
      DistributedNotificationCenter.default().addObserver(
        observer, selector: #selector(SignalObserver.post),
        name: Notification.Name("com.apple.screenIsLocked"), object: nil,
        suspensionBehavior: .deliverImmediately)
      continuation.onTermination = { _ in
        NSWorkspace.shared.notificationCenter.removeObserver(observer)
        DistributedNotificationCenter.default().removeObserver(observer)
      }
    }
  }

  /// Turns a notification into a call, for the centres that take a selector.
  private final class SignalObserver: NSObject {
    private let onPost: @Sendable () -> Void

    init(_ onPost: @escaping @Sendable () -> Void) {
      self.onPost = onPost
    }

    @objc func post(_ notification: Notification) {
      onPost()
    }
  }
#endif
