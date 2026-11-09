import CoreEntrance
import Foundation
import Observation

/// Today's entry, saved as it is typed. The vault waits for the save before
/// it locks, and stays open if that save fails.
@Observable
final class TodayModel {
  enum Reading: Equatable {
    case inProgress
    case read
    /// No editor is shown then, so nothing typed can overwrite the entry.
    case failed(AppError)
  }

  enum SaveMessage: Equatable {
    case saving
    case saved
    case failed(AppError)
  }

  /// The day being written, fixed when the diary opens.
  let date: EntryDate
  private(set) var reading = Reading.inProgress
  /// The entry as last read or stored; `nil` while nothing is stored.
  private(set) var entry: Entry?
  /// The newest body from the editor; `nil` until it reports one.
  private(set) var typed: String?
  private(set) var saving = false
  /// The last save failure, until a save succeeds.
  private(set) var saveFailure: AppError?
  /// True from asking to lock until the vault locks or the save fails.
  private(set) var locking = false
  /// The save waiting for typing to pause.
  private var waiting: Task<Void, Never>?
  /// The last save asked for. Saves run one after another.
  private var running: Task<Bool, Never>?
  /// The lock under way, which a second request to lock waits for.
  private var lockTask: Task<Void, Never>?

  private let diary: any Diary
  private let saveDelay: Duration

  /// `saveDelay` is how long typing must pause before the entry is saved.
  init(diary: any Diary, day: Date = .now, saveDelay: Duration = .seconds(1)) {
    self.diary = diary
    date = EntryDate(of: day)
    self.saveDelay = saveDelay
  }

  /// The body an editor starts with: what was last typed, else what is stored.
  var initialBody: String {
    typed ?? entry?.body ?? ""
  }

  var saveMessage: SaveMessage? {
    if let saveFailure { return .failed(saveFailure) }
    if saving || !isStored { return .saving }
    return entry == nil ? nil : .saved
  }

  /// True when the newest body is the one stored.
  private var isStored: Bool {
    typed == nil || typed == entry?.body
  }

  func load() async {
    do throws(AppError) {
      entry = try await diary.entry(on: date)
      reading = .read
    } catch {
      reading = .failed(error)
    }
  }

  /// Takes `body` as the newest, and saves it once nothing newer has come
  /// for the save delay. Returns the task that waits and saves.
  @discardableResult
  func changed(_ body: String) -> Task<Void, Never> {
    typed = body
    waiting?.cancel()
    let task = Task { [saveDelay] in
      do {
        try await Task.sleep(for: saveDelay)
      } catch {
        // A newer body came, and its own task saves it.
        return
      }
      await save()
    }
    waiting = task
    return task
  }

  /// Saves the newest body now, after the saves before it, unless it is
  /// stored already. A body that failed to save is tried again. Returns
  /// whether the newest body is stored.
  @discardableResult
  func save() async -> Bool {
    waiting?.cancel()
    waiting = nil
    let previous = running
    let task = Task {
      _ = await previous?.value
      return await storeNewest()
    }
    running = task
    return await task.value
  }

  /// Saves what is waiting, then calls `lockVault`. Stays open when the save
  /// fails, and the save message says why. Asked again while it runs, it
  /// returns the same task, so the vault is locked once. Returns the task
  /// that saves.
  @discardableResult
  func lock(then lockVault: @escaping () -> Void) -> Task<Void, Never> {
    if let lockTask { return lockTask }
    locking = true
    let task = Task {
      defer {
        locking = false
        lockTask = nil
      }
      // A change can arrive after a save ends and before this task resumes;
      // the vault locks only once nothing is left unsaved.
      repeat {
        guard await save() else { return }
      } while !isStored
      lockVault()
    }
    lockTask = task
    return task
  }

  /// Stores the newest body, again while typing goes on during a save.
  private func storeNewest() async -> Bool {
    saving = true
    defer { saving = false }
    while let body = typed, body != entry?.body {
      do throws(AppError) {
        entry = try await diary.save(Entry(body: body, font: entry?.font), on: date)
        saveFailure = nil
      } catch {
        saveFailure = error
        return false
      }
    }
    return true
  }
}
