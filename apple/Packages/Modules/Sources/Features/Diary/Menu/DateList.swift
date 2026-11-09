import CoreEntrance
import SwiftUI

/// Years that open to their months, or one month's days (`Sidebar` in the
/// Tauri app). It starts on the days of the day shown, with its year open.
struct DateList: View {
  let years: [CalendarYear]
  let selected: EntryDate
  let onChoose: (EntryDate) -> Void
  /// The month whose days are listed; `nil` while the years are.
  @State private var shownMonth: CalendarMonth.ID?
  @State private var openYears: Set<Int>

  init(years: [CalendarYear], selected: EntryDate, onChoose: @escaping (EntryDate) -> Void) {
    self.years = years
    self.selected = selected
    self.onChoose = onChoose
    _shownMonth = State(initialValue: selected.calendarMonth)
    _openYears = State(initialValue: [selected.year])
  }

  var body: some View {
    if let month = years.lazy.flatMap(\.months).first(where: { $0.id == shownMonth }) {
      MonthDays(
        month: month, selected: selected, onBack: { shownMonth = nil }, onChoose: onChoose)
    } else {
      YearList(
        years: years, openYears: openYears, onToggle: toggle, onShowMonth: { shownMonth = $0 })
    }
  }

  private func toggle(_ year: Int) {
    if openYears.remove(year) == nil {
      openYears.insert(year)
    }
  }
}

/// A month's days, under a button back to the years.
private struct MonthDays: View {
  let month: CalendarMonth
  let selected: EntryDate
  let onBack: () -> Void
  let onChoose: (EntryDate) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Button(action: onBack) {
        Label(month.id.title, systemImage: "arrowtriangle.left")
      }
      .buttonStyle(.menuRow)
      .accessibilityHint("年と月の一覧に戻ります")
      ForEach(month.days, id: \.self) { day in
        Button {
          onChoose(day)
        } label: {
          Text(verbatim: "\(day.day)")
        }
        .buttonStyle(.menuRow(current: day == selected))
        .padding(.leading, 28)
      }
    }
  }
}

/// Years, each opening to its months.
private struct YearList: View {
  let years: [CalendarYear]
  let openYears: Set<Int>
  let onToggle: (Int) -> Void
  let onShowMonth: (CalendarMonth.ID) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      ForEach(years) { year in
        let open = openYears.contains(year.year)
        VStack(alignment: .leading, spacing: 0) {
          Button {
            onToggle(year.year)
          } label: {
            Text(verbatim: "\(year.year)")
          }
          .buttonStyle(.menuRow)
          .accessibilityValue(open ? "開いています" : "閉じています")
          if open {
            ForEach(year.months) { month in
              Button {
                onShowMonth(month.id)
              } label: {
                Text(verbatim: "\(month.id.month)")
              }
              .buttonStyle(.menuRow)
              .padding(.leading, 24)
            }
          }
        }
      }
    }
  }
}

#Preview("今月の日") {
  let today = EntryDate(of: .now)
  let earlier = EntryDate(of: .now.addingTimeInterval(-24 * 60 * 60))
  DateList(years: calendar(of: [earlier, today]), selected: today) { _ in }
    .padding()
}

#Preview("去年の日") {
  let today = EntryDate(of: .now)
  let lastYear = EntryDate(of: .now.addingTimeInterval(-366 * 24 * 60 * 60))
  DateList(years: calendar(of: [lastYear, today]), selected: lastYear) { _ in }
    .padding()
}
