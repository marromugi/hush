/// Making, opening, and closing the vault on this device.
public protocol Vault: Sendable {
  func status() async -> VaultStatus
  /// Makes the vault and opens it. Returns its Secret Key as text, for the
  /// person to keep.
  func create(passphrase: String) async throws(AppError) -> String
  /// `secretKey` is typed only on a device that does not have it yet.
  func unlock(passphrase: String, secretKey: String?) async throws(AppError)
  /// Asks for Touch ID or Face ID, showing `reason` where the system has
  /// room for it, and opens the vault with the key kept behind it.
  func unlockWithBiometry(reason: String) async throws(AppError)
  func lock()
  /// Whether this device has Touch ID or Face ID, and whether the vault
  /// opens with it here. Asks for nothing.
  func biometryStatus() async throws(AppError) -> BiometryStatus
  /// Lets the vault open with Touch ID or Face ID on this device. Only while
  /// it is open.
  func turnOnBiometry() async throws(AppError)
  func turnOffBiometry() async throws(AppError)
  /// The vault's Secret Key as text, to show again. Only while it is open.
  func secretKey() async throws(AppError) -> String
}
