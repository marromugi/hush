import SwiftUI

/// The narrow column every vault screen is laid out in.
struct VaultPage<Content: View>: View {
  let title: LocalizedStringKey
  @ViewBuilder let content: Content

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        Text(title)
          .font(.title2.bold())
          .accessibilityAddTraits(.isHeader)
        content
      }
      .frame(maxWidth: 400, alignment: .leading)
      .padding()
      .frame(maxWidth: .infinity)
    }
    .scrollBounceBehavior(.basedOnSize)
  }
}
