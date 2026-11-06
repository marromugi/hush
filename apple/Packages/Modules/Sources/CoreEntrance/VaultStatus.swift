internal import CoreBindings

public enum VaultStatus: Sendable, Equatable {
  case missing
  /// Locked, and this device has no Secret Key for the vault yet.
  case needsSecretKey
  case locked
  case unlocked
}

extension VaultStatus {
  init(_ status: CoreBindings.VaultStatus) {
    switch status {
    case .missing: self = .missing
    case .needsSecretKey: self = .needsSecretKey
    case .locked: self = .locked
    case .unlocked: self = .unlocked
    }
  }
}
