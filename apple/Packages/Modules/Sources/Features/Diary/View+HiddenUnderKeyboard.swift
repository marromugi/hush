import SwiftUI

extension View {
  /// Hidden while the on-screen keyboard is up, or the bar a hardware
  /// keyboard leaves at the bottom, either of which would cover part of it.
  /// It keeps its room, so nothing around it moves.
  func hiddenUnderKeyboard() -> some View {
    modifier(HiddenUnderKeyboard())
  }
}

private struct HiddenUnderKeyboard: ViewModifier {
  #if os(iOS)
    @State private var keyboardUp = false

    func body(content: Content) -> some View {
      content
        .opacity(keyboardUp ? 0 : 1)
        .accessibilityHidden(keyboardUp)
        .task {
          for await _ in NotificationCenter.default.notifications(
            named: UIResponder.keyboardWillShowNotification)
          {
            keyboardUp = true
          }
        }
        .task {
          for await _ in NotificationCenter.default.notifications(
            named: UIResponder.keyboardWillHideNotification)
          {
            keyboardUp = false
          }
        }
    }
  #else
    func body(content: Content) -> some View { content }
  #endif
}
