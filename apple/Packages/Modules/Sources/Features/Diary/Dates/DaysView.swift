import CoreEntrance
import SwiftUI

/// A month's days with an entry; choosing one shows it.
struct DaysView: View {
  /// `nil` while no month is chosen.
  let month: CalendarMonth?
  @Binding var selected: EntryDate?

  var body: some View {
    List(month?.days ?? [], id: \.self, selection: $selected) { day in
      Text(verbatim: "\(day.day)")
        .monospacedDigit()
    }
    .navigationTitle(month?.id.title ?? "")
  }
}

#Preview {
  @Previewable @State var selected: EntryDate? = EntryDate(of: .now)
  NavigationStack {
    DaysView(month: calendar(of: [EntryDate(of: .now)]).first?.months.first, selected: $selected)
  }
}
