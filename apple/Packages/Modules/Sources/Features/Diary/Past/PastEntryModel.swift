import CoreEntrance
import Observation

/// A day before today, read once, to show only.
@Observable
final class PastEntryModel {
  enum Reading: Equatable {
    case inProgress
    /// `nil` when nothing is stored for the day.
    case read(Entry?)
    case failed(AppError)
  }

  let date: EntryDate
  private(set) var reading = Reading.inProgress

  private let diary: any Diary

  init(diary: any Diary, date: EntryDate) {
    self.diary = diary
    self.date = date
  }

  func load() async {
    do throws(AppError) {
      reading = .read(try await diary.entry(on: date))
    } catch {
      reading = .failed(error)
    }
  }
}
