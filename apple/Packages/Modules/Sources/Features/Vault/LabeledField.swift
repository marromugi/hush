import SwiftUI

/// A text field with its label above it, and what went wrong with it below.
struct LabeledField<Field: View>: View {
  let label: LocalizedStringKey
  let failure: LocalizedStringKey?
  let field: Field

  init(
    _ label: LocalizedStringKey,
    failure: LocalizedStringKey?,
    @ViewBuilder field: () -> Field
  ) {
    self.label = label
    self.failure = failure
    self.field = field()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(label)
        .font(.subheadline)
        // The field says its own name.
        .accessibilityHidden(true)
      field
        .textFieldStyle(.roundedBorder)
      if let failure {
        FailureText(failure)
      }
    }
  }
}
