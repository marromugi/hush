import CoreEntrance
import Observation

/// The vault's Secret Key, read each time it is shown.
@Observable
final class SecretKeyModel {
  enum Reading: Equatable {
    case inProgress
    case read(String)
    case failed(AppError)
  }

  private(set) var reading = Reading.inProgress

  private let vault: any Vault

  init(vault: any Vault) {
    self.vault = vault
  }

  func load() async {
    do throws(AppError) {
      reading = .read(try await vault.secretKey())
    } catch {
      reading = .failed(error)
    }
  }
}
