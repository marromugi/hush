/// Making, opening, and closing the vault on this device.
public protocol Vault: Sendable {
  func status() async -> VaultStatus
  /// Makes the vault and opens it. Returns its Secret Key as text, for the
  /// person to keep.
  func create(passphrase: String) async throws(AppError) -> String
  /// `secretKey` is typed only on a device that does not have it yet.
  func unlock(passphrase: String, secretKey: String?) async throws(AppError)
  func lock()
}
