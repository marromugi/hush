import CoreEntrance
import Observation
import SwiftUI

/// Where the vault stands, and making, opening, and closing it.
@Observable
public final class VaultModel {
  /// `nil` until the first read finishes.
  private(set) var status: VaultStatus?
  /// The last create or unlock failure, until the next one starts.
  private(set) var failure: AppError?
  /// The Secret Key of the vault just made, until the person has kept it.
  private(set) var newSecretKey: String?
  /// `nil` unless the vault opens with Touch ID or Face ID on this device.
  /// Read again each time the locked screen comes to the front.
  private(set) var biometry: Biometry?
  /// Whether Touch ID or Face ID was asked for since the locked screen last
  /// came to the front. The prompt takes the app out of the front itself, so
  /// coming back from it does not count.
  private var askedForBiometry = false
  private var running: Task<Void, Never>?

  private let vault: any Vault

  public init(vault: any Vault) {
    self.vault = vault
  }

  /// True while a create or unlock runs.
  var busy: Bool { running != nil }

  func load() async {
    status = await vault.status()
  }

  @discardableResult
  func create(passphrase: String) -> Task<Void, Never> {
    start { [self] () async throws(AppError) in
      newSecretKey = try await vault.create(passphrase: passphrase)
      status = .unlocked
    }
  }

  /// `secretKey` is typed only on a device that does not have it yet.
  @discardableResult
  func unlock(passphrase: String, secretKey: String? = nil) -> Task<Void, Never> {
    start { [self] () async throws(AppError) in
      try await vault.unlock(passphrase: passphrase, secretKey: secretKey)
      status = .unlocked
    }
  }

  /// Asks for Touch ID or Face ID, as when the person taps the button for it.
  @discardableResult
  func unlockWithBiometry() -> Task<Void, Never> {
    start { [self] () async throws(AppError) in
      try await vault.unlockWithBiometry(reason: Self.biometryReason)
      status = .unlocked
    }
  }

  /// Follows the app in and out of the front. Each time the locked screen
  /// comes to the front, it asks once for Touch ID or Face ID, when the
  /// person has turned it on. Returns the task that asks, if it asks.
  @discardableResult
  func sceneChanged(to phase: ScenePhase) -> Task<Void, Never>? {
    switch phase {
    case .background:
      askedForBiometry = false
      return nil
    case .active:
      guard status == .locked, !askedForBiometry else { return nil }
      askedForBiometry = true
      return Task {
        biometry = await biometryTurnedOn()
        if biometry != nil { await unlockWithBiometry().value }
      }
    default:
      return nil
    }
  }

  func keptSecretKey() {
    newSecretKey = nil
  }

  func lock() {
    vault.lock()
    // A Secret Key still waiting to be kept is not shown again once locked.
    newSecretKey = nil
    status = .locked
    askedForBiometry = false
  }

  /// Shown under "Touch ID" in the system prompt.
  private static let biometryReason = "日記帳を開きます。"

  /// The kind the vault opens with on this device, or `nil` when it opens
  /// only with the passphrase.
  private func biometryTurnedOn() async -> Biometry? {
    do throws(AppError) {
      let status = try await vault.biometryStatus()
      return status.isOn ? status.biometry : nil
    } catch {
      // Without it the passphrase still opens the vault.
      return nil
    }
  }

  /// Runs `work` unless a create or unlock is running already, and returns
  /// the task that runs.
  private func start(_ work: @escaping () async throws(AppError) -> Void) -> Task<Void, Never> {
    if let running { return running }
    failure = nil
    let task = Task {
      do throws(AppError) {
        try await work()
      } catch {
        // A dismissed Touch ID prompt needs no words.
        failure = error == .biometryCancelled ? nil : error
        // The device lost the vault's Secret Key, or never kept it: ask for it.
        if error == .noSecretKey { status = .needsSecretKey }
      }
      running = nil
    }
    running = task
    return task
  }
}
