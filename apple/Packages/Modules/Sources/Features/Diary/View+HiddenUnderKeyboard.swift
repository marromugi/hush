import SwiftUI

extension View {
  /// Hidden while the on-screen keyboard, or the bar a hardware keyboard
  /// leaves, covers the bottom of the screen, either of which would cover
  /// part of it. It keeps its room, so nothing around it moves.
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
          // Every move of the keyboard comes as a change of its frame, the
          // hardware keyboard's bar included; "will show" does not always.
          for await moved in NotificationCenter.default.notifications(
            named: UIResponder.keyboardWillChangeFrameNotification)
          {
            keyboardUp = coversBottom(moved)
          }
        }
    }

    /// Whether the keyboard, where it is going, reaches the bottom edge of
    /// its screen. A keyboard leaving ends below the screen.
    private func coversBottom(_ moved: Notification) -> Bool {
      guard let screen = moved.object as? UIScreen,
        let end = moved.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect
      else { return false }
      let bottom = screen.bounds.maxY
      return end.minY < bottom && end.maxY >= bottom - 1
    }
  #else
    func body(content: Content) -> some View { content }
  #endif
}
