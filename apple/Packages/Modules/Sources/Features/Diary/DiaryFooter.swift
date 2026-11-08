import CoreEntrance
import SwiftUI

/// The foot of the diary: the day shown, as `2026.11.8`, with a grey dot
/// beside it. The dot holds the place of what the day will show there later.
struct DiaryFooter: View {
  let date: EntryDate

  var body: some View {
    HStack(spacing: 12) {
      Text(verbatim: date.title)
        .font(.title3.bold())
        .monospacedDigit()
      Circle()
        .fill(.quaternary)
        .frame(width: 16, height: 16)
        .accessibilityHidden(true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 20)
    .padding(.vertical, 16)
  }
}

#Preview {
  DiaryFooter(date: EntryDate(of: .now))
}
