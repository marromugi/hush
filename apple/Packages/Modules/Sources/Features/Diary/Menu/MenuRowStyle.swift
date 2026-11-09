import SwiftUI

/// One row of the diary's menu: faint unless it is the day shown
/// (`menuItem` in the Tauri app).
struct MenuRowStyle: ButtonStyle {
  /// Whether the row is the day shown.
  var current = false

  func makeBody(configuration: Configuration) -> some View {
    MenuRow(label: configuration.label, current: current, pressed: configuration.isPressed)
  }
}

extension ButtonStyle where Self == MenuRowStyle {
  static var menuRow: MenuRowStyle { MenuRowStyle() }

  static func menuRow(current: Bool) -> MenuRowStyle { MenuRowStyle(current: current) }
}

private struct MenuRow<Label: View>: View {
  let label: Label
  let current: Bool
  let pressed: Bool
  @Environment(\.isEnabled) private var isEnabled

  var body: some View {
    label
      .font(.subheadline)
      .monospacedDigit()
      .foregroundStyle(current ? .primary : .secondary)
      .opacity(isEnabled ? (pressed ? 0.6 : 1) : 0.4)
      .padding(.vertical, 6)
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(.rect)
      .accessibilityAddTraits(current ? .isSelected : [])
  }
}
