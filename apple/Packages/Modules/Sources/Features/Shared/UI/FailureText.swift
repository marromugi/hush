import SwiftUI

/// What went wrong, in the color every failure is shown in.
struct FailureText: View {
  let text: LocalizedStringKey

  init(_ text: LocalizedStringKey) {
    self.text = text
  }

  var body: some View {
    Text(text)
      .font(.callout)
      .foregroundStyle(.red)
  }
}
