/// How a call failed, by what the screens do about it.
public enum AppError: Error, Equatable, Sendable {
  case emptyPassphrase
  case wrongPassphrase
  /// The Secret Key was typed, so either of the two can be the wrong one.
  case wrongPassphraseOrSecretKey
  /// The typed text is not a Secret Key.
  case invalidSecretKey
  /// This device has no Secret Key for the vault, so it has to be typed.
  case noSecretKey
  /// The vault was made by a newer version of the app.
  case newerVault
  /// The vault is from before Secret Keys, and this app cannot open it.
  case outdatedVault
  case brokenVault
  case keychain
  /// The entry was written by a newer version of the app.
  case newerEntry
  case brokenEntry
  /// Anything else. The log says what happened.
  case unexpected
}
