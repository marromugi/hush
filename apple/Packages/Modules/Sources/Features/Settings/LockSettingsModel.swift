import CoreEntrance
import Observation

/// Whether this device opens the vault with Touch ID or Face ID as well as
/// the passphrase.
@Observable
final class LockSettingsModel {
  /// `nil` until read.
  private(set) var status: BiometryStatus?
  /// True while turning it on or off.
  private(set) var busy = false
  /// The last read or change that failed, until the next change starts.
  private(set) var failure: AppError?

  private let vault: any Vault

  init(vault: any Vault) {
    self.vault = vault
  }

  func load() async {
    do throws(AppError) {
      status = try await vault.biometryStatus()
    } catch {
      failure = error
    }
  }

  /// Turns it on or off. Returns the task that does it.
  @discardableResult
  func setOn(_ on: Bool) -> Task<Void, Never> {
    busy = true
    failure = nil
    return Task {
      do throws(AppError) {
        if on {
          try await vault.turnOnBiometry()
        } else {
          try await vault.turnOffBiometry()
        }
        status?.isOn = on
      } catch {
        failure = error
      }
      busy = false
    }
  }
}
