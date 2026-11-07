import CoreEntrance

extension EntryDate {
  /// `2026.11.7`, as the Tauri app's header shows a day.
  var title: String {
    "\(year).\(month).\(day)"
  }
}

extension CalendarMonth.ID {
  /// `2026.11`, as the Tauri app's sidebar shows a month.
  var title: String {
    "\(year).\(month)"
  }
}
