import CoreEntrance

extension EntryDate {
  /// `2026.11.7`, as the diary's footer shows a day.
  var title: String {
    "\(year).\(month).\(day)"
  }
}

extension CalendarMonth.ID {
  /// `2026.11`, as the menu shows the month whose days it lists.
  var title: String {
    "\(year).\(month)"
  }
}
