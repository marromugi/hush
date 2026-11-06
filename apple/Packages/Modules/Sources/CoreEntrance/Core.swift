internal import CoreBindings
import Foundation

/// The one way into the Rust core.
public struct Core: Sendable {
  private let handle: CoreHandle

  /// `dataDirectory` is where the vault and its entries are kept.
  public init(dataDirectory: URL) {
    handle = CoreHandle(dataDir: dataDirectory.path(percentEncoded: false))
  }

  /// Reads the vault file and the keychain, so it leaves the main actor.
  @concurrent
  public func vaultStatus() async -> VaultStatus {
    VaultStatus(handle.vaultStatus())
  }
}
