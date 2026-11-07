import CoreEntrance
import SwiftUI

/// Where a form shows a failure.
nonisolated enum FormPart {
  case passphraseField
  case secretKeyField
  /// Under both fields, since either can be the wrong one.
  case bothFields
  case wholeForm
}

extension AppError {
  var part: FormPart {
    switch self {
    case .emptyPassphrase, .wrongPassphrase: .passphraseField
    case .invalidSecretKey: .secretKeyField
    case .wrongPassphraseOrSecretKey: .bothFields
    case .noSecretKey, .newerVault, .outdatedVault, .brokenVault, .keychain, .newerEntry,
      .brokenEntry, .unsupportedPicture, .newerImage, .brokenImage, .invalidImageId, .noImage,
      .link, .unreadableLink, .embedPages, .unexpected:
      .wholeForm
    }
  }

  /// The words, when this failure is shown at `part`.
  func text(at part: FormPart) -> LocalizedStringKey? {
    self.part == part ? text : nil
  }
}
