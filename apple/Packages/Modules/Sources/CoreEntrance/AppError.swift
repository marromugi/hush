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
  /// The device has no Touch ID or Face ID.
  case noBiometry
  /// The person dismissed the Touch ID or Face ID prompt.
  case biometryCancelled
  /// Touch ID or Face ID did not recognize the person.
  case biometryFailed
  /// The key kept behind Touch ID or Face ID could not be read or written.
  case biometricKeychain
  /// No key comes out from behind Touch ID or Face ID any more, as after the
  /// fingers or face set up changed.
  case noKeptKey
  /// The entry was written by a newer version of the app.
  case newerEntry
  case brokenEntry
  /// The picture is not a JPEG, PNG, or GIF.
  case unsupportedPicture
  /// The image was saved by a newer version of the app.
  case newerImage
  case brokenImage
  /// The entry names an image by something that is not an image's id.
  case invalidImageId
  case noImage
  /// The page or picture a link points at could not be fetched.
  case link
  /// The link is not one the app reads: not `http` or `https`, or on this
  /// device's own network.
  case unreadableLink
  /// The pages videos are shown in are not served.
  case embedPages
  /// Anything else. The log says what happened.
  case unexpected
}
