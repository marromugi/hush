import CoreEntrance
import Observation

/// The passphrase, typed twice so a typo cannot lock the person out.
@Observable
final class CreateVaultForm {
  var passphrase: String
  var confirm: String
  /// Set by a submit with two different passphrases, until the next submit.
  private(set) var mismatched = false

  init(passphrase: String = "", confirm: String = "") {
    self.passphrase = passphrase
    self.confirm = confirm
  }

  /// Hands the passphrase to `create` only when it was typed the same way
  /// twice. Does nothing while a create runs, so its failure is not hidden.
  func submit(busy: Bool, create: (String) -> Void) {
    guard !busy else { return }
    mismatched = passphrase != confirm
    if !mismatched { create(passphrase) }
  }

  /// A mismatch means nothing was tried, so a failure from an earlier try is stale.
  func shown(_ failure: AppError?) -> AppError? {
    mismatched ? nil : failure
  }
}
