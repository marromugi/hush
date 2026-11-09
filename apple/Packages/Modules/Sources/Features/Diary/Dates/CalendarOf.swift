import CoreEntrance

/// A year's months that have entries.
struct CalendarYear: Identifiable, Equatable {
  let year: Int
  var months: [CalendarMonth]

  var id: Int { year }
}

/// A month's days that have entries.
struct CalendarMonth: Identifiable, Equatable {
  struct ID: Hashable {
    let year: Int
    /// 1 for January.
    let month: Int
  }

  let id: ID
  var days: [EntryDate]
}

extension EntryDate {
  /// The month this date falls in.
  var calendarMonth: CalendarMonth.ID {
    CalendarMonth.ID(year: year, month: month)
  }
}

/// `dates`, oldest first and each once, grouped by year and month
/// (`calendarOf` on the web side). The newest year comes first; months and
/// days run oldest first, as on a calendar.
func calendar(of dates: [EntryDate]) -> [CalendarYear] {
  var years: [CalendarYear] = []
  for date in dates {
    if years.first?.year != date.year {
      years.insert(CalendarYear(year: date.year, months: []), at: 0)
    }
    if years[0].months.last?.id != date.calendarMonth {
      years[0].months.append(CalendarMonth(id: date.calendarMonth, days: []))
    }
    years[0].months[years[0].months.count - 1].days.append(date)
  }
  return years
}
