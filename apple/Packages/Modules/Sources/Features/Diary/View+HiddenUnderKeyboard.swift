import SwiftUI

extension View {
  /// Hidden while the keyboard covers the bottom of the screen, where it
  /// would show through or beside the keyboard. It keeps its room, so
  /// nothing around it moves. The bar a hardware keyboard leaves on iOS 27
  /// comes with no notice when the editor takes focus, and floats over it.
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
          // A change of frame also comes when a hardware keyboard is
          // plugged in or out while the keyboard is up; "will show" does not.
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
