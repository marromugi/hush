import CoreEntrance
import Foundation
import Observation

/// The diary while the vault is open: the days to choose from, which one is
/// shown, and today's entry. Today's entry is kept while other days are
/// read, so that nothing typed is lost on the way back.
@Observable
final class DiaryModel {
  enum Listing: Equatable {
    case inProgress
    case listed
    /// Only today is listed then.
    case failed(AppError)
  }

  let today: TodayModel
  private(set) var listing = Listing.inProgress
  /// The month whose days are listed. Today's at first.
  var month: CalendarMonth.ID?
  /// The day shown. Today at first; `nil` once none is chosen, as after
  /// going back to the list on a narrow screen.
  var selected: EntryDate?

  /// Days with an entry, without today.
  private var written: [EntryDate] = []
  private let diary: any Diary

  init(diary: any Diary, day: Date = .now) {
    self.diary = diary
    today = TodayModel(diary: diary, day: day)
    month = today.date.calendarMonth
    selected = today.date
  }

  /// Days with an entry, and today even before anything is written.
  var years: [CalendarYear] {
    calendar(of: Set(written + [today.date]).sorted())
  }

  /// The month whose days are listed, with its days.
  var shownMonth: CalendarMonth? {
    years.lazy.flatMap(\.months).first { $0.id == month }
  }

  /// Reads today's entry, then lists the days.
  func load() async {
    await today.load()
    do throws(AppError) {
      written = try await diary.entryDates()
      listing = .listed
    } catch {
      listing = .failed(error)
    }
  }
}
