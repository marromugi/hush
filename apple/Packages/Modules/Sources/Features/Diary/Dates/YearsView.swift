import CoreEntrance
import SwiftUI

/// Years that open to their months; choosing a month lists its days.
struct YearsView: View {
  let years: [CalendarYear]
  /// Why the days could not be listed; only today is listed then.
  let failure: AppError?
  @Binding var month: CalendarMonth.ID?

  var body: some View {
    List(selection: $month) {
      ForEach(years) { year in
        DisclosureGroup {
          ForEach(year.months) { month in
            Text(verbatim: "\(month.id.month)")
              .monospacedDigit()
          }
        } label: {
          Text(verbatim: "\(year.year)")
            .monospacedDigit()
        }
      }
      if let failure {
        FailureText(failure.text)
      }
    }
    .navigationTitle("日記")
  }
}

#Preview("書いた年がある") {
  @Previewable @State var month: CalendarMonth.ID?
  let today = EntryDate(of: .now)
  let lastYear = EntryDate(of: .now.addingTimeInterval(-366 * 24 * 60 * 60))
  NavigationStack {
    YearsView(years: calendar(of: [lastYear, today]), failure: nil, month: $month)
  }
}

#Preview("一覧を作れない") {
  @Previewable @State var month: CalendarMonth.ID?
  NavigationStack {
    YearsView(
      years: calendar(of: [EntryDate(of: .now)]), failure: .unexpected, month: $month)
  }
}
