import CoreEntrance
import Observation

/// Where the vault stands, and making, opening, and closing it.
@Observable
public final class VaultModel {
  /// `nil` until the first read finishes.
  private(set) var status: VaultStatus?
  /// The last create or unlock failure, until the next one starts.
  private(set) var failure: AppError?
  /// The Secret Key of the vault just made, until the person has kept it.
  private(set) var newSecretKey: String?
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

  func keptSecretKey() {
    newSecretKey = nil
  }

  func lock() {
    vault.lock()
    // A Secret Key still waiting to be kept is not shown again once locked.
    newSecretKey = nil
    status = .locked
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
        failure = error
        // The device lost the vault's Secret Key, or never kept it: ask for it.
        if error == .noSecretKey { status = .needsSecretKey }
      }
      running = nil
    }
    running = task
    return task
  }
}
