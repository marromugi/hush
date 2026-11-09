import CoreEntrance
import SwiftUI

/// The diary once the vault is open: the day shown, and the menu of days,
/// settings, and lock. A wide screen keeps the menu at the left of the day;
/// a narrow one slides it over the day from MENU. Today is written; the days
/// before it are read only.
struct DiaryView: View {
  /// From this width the menu stays beside the day (`md` in the Tauri app).
  /// Read off the main actor, by the measuring of the width.
  nonisolated private static let wideWidth: CGFloat = 768

  @State private var model: DiaryModel
  /// Whether the menu stays beside the day.
  @State private var wide = false
  /// Whether MENU slid the menu over the day.
  @State private var menuShown = false
  @State private var sheet: DiarySheet?
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  private let vault: any Vault
  private let diary: any Diary
  let host: any EntryHost
  let files: EditorFiles
  /// Locks when the diary is left unattended.
  let onLock: () -> Void
  /// Locks when the person chooses ロック in the menu.
  let onLockByHand: () -> Void

  /// `vault` is for the settings and the Secret Key.
  init(
    vault: any Vault, diary: any Diary, host: any EntryHost, files: EditorFiles,
    onLock: @escaping () -> Void, onLockByHand: @escaping () -> Void
  ) {
    _model = State(initialValue: DiaryModel(diary: diary))
    self.vault = vault
    self.diary = diary
    self.host = host
    self.files = files
    self.onLock = onLock
    self.onLockByHand = onLockByHand
  }

  var body: some View {
    HStack(spacing: 0) {
      if wide {
        menu
          .frame(width: 220)
      }
      // After the optional menu, so that the editor keeps its identity, and
      // its page, as the width crosses `wideWidth`.
      DayPage(
        model: model, diary: diary, host: host, files: files, onMenu: wide ? nil : { openMenu() })
    }
    .accessibilityHidden(menuSlidOver)
    .overlay {
      if menuSlidOver {
        Scrim { closeMenu() }
          .transition(.opacity)
      }
    }
    .overlay(alignment: .leading) {
      if menuSlidOver {
        menu
          .frame(maxWidth: 300, maxHeight: .infinity)
          .background {
            Color.page
              .shadow(color: .black.opacity(0.15), radius: 16)
              // The shadow is lost on a dark page; the edge still shows
              // where the menu ends.
              .overlay(alignment: .trailing) {
                Rectangle()
                  .fill(.separator)
                  .frame(width: 1)
              }
              .ignoresSafeArea()
          }
          .accessibilityAddTraits(.isModal)
          .accessibilityAction(.escape) { closeMenu() }
          .transition(reduceMotion ? AnyTransition.opacity : .move(edge: .leading))
      }
    }
    // Under the keyboard too: the day reaches under it, and the corners of
    // a floating keyboard show what lies behind.
    .background { Color.page.ignoresSafeArea() }
    .onGeometryChange(for: Bool.self) {
      $0.size.width >= Self.wideWidth
    } action: { wide in
      self.wide = wide
      if wide {
        menuShown = false
      }
    }
    .sheet(item: $sheet) { sheet in
      switch sheet {
      case .settings: SettingsView(vault: vault)
      case .secretKey: SecretKeyView(vault: vault)
      }
    }
    .task { await model.load() }
    .lockWhenLeftUnattended { model.today.lock(then: onLock) }
  }

  private var menuSlidOver: Bool { menuShown && !wide }

  /// The same menu beside the day and slid over it.
  private var menu: DiaryMenu {
    DiaryMenu(
      years: model.years, failure: model.listingFailure, selected: model.selected,
      locking: model.today.locking, onChoose: choose, onSettings: { open(.settings) },
      onSecretKey: { open(.secretKey) }, onLock: lock)
  }

  private func openMenu() {
    withAnimation { menuShown = true }
  }

  private func closeMenu() {
    withAnimation { menuShown = false }
  }

  private func choose(_ day: EntryDate) {
    model.select(day)
    closeMenu()
  }

  private func open(_ sheet: DiarySheet) {
    closeMenu()
    self.sheet = sheet
  }

  /// Puts the menu away first, so that a save that keeps the vault open
  /// shows why.
  private func lock() {
    closeMenu()
    model.today.lock(then: onLockByHand)
  }
}

/// What the menu opens over the diary.
private enum DiarySheet: Identifiable {
  case settings
  case secretKey

  var id: Self { self }
}

/// The day dimmed behind the menu slid over it; a tap on it closes the menu.
private struct Scrim: View {
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      Color.black.opacity(0.2)
    }
    .buttonStyle(.plain)
    .ignoresSafeArea()
    .accessibilityLabel("メニューを閉じる")
  }
}

#Preview("今日") {
  DiaryView(
    vault: FakeVault(status: .unlocked), diary: FakeDiary(), host: FakeEntryHost(),
    files: EditorFiles(folder: Bundle.main.bundleURL)
  ) {
  } onLockByHand: {
  }
}

#Preview("一覧を作れない") {
  DiaryView(
    vault: FakeVault(status: .unlocked), diary: FakeDiary(failure: .unexpected),
    host: FakeEntryHost(), files: EditorFiles(folder: Bundle.main.bundleURL)
  ) {
  } onLockByHand: {
  }
}
