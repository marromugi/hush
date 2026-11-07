internal import CoreBindings
import Foundation
import os

/// The one way into the Rust core.
public struct Core: Sendable {
  private let handle: CoreHandle

  /// `dataDirectory` is where the vault and its entries are kept.
  public init(dataDirectory: URL) {
    handle = CoreHandle(dataDir: dataDirectory.path(percentEncoded: false))
  }
}

extension Core: Vault {
  /// Reads the vault file and the keychain, so it leaves the main actor.
  @concurrent
  public func status() async -> VaultStatus {
    VaultStatus(handle.vaultStatus())
  }

  /// Derives the key, which is slow on purpose, so it leaves the main actor.
  @concurrent
  public func create(passphrase: String) async throws(AppError) -> String {
    try await call { try handle.createVault(passphrase: passphrase) }
  }

  /// Derives the key, which is slow on purpose, so it leaves the main actor.
  @concurrent
  public func unlock(passphrase: String, secretKey: String?) async throws(AppError) {
    try await call { try handle.unlockVault(passphrase: passphrase, secretKey: secretKey) }
  }

  public func unlockWithBiometry(reason: String) async throws(AppError) {
    try await call { try await handle.unlockWithBiometry(reason: reason) }
  }

  public func lock() {
    handle.lockVault()
  }

  /// Reads the vault file and the keychain, so it leaves the main actor.
  @concurrent
  public func biometryStatus() async throws(AppError) -> BiometryStatus {
    BiometryStatus(try await call { try handle.biometryStatus() })
  }

  /// Writes to the keychain, so it leaves the main actor.
  @concurrent
  public func turnOnBiometry() async throws(AppError) {
    try await call { try handle.turnOnBiometry() }
  }

  /// Writes to the keychain, so it leaves the main actor.
  @concurrent
  public func turnOffBiometry() async throws(AppError) {
    try await call { try handle.turnOffBiometry() }
  }
}

extension Core: Diary {
  /// Reads and decrypts a file, so it leaves the main actor.
  @concurrent
  public func entry(on date: EntryDate) async throws(AppError) -> Entry? {
    try await call { try handle.readEntry(date: date.text) }.map(Entry.init)
  }

  /// Encrypts and writes a file, so it leaves the main actor.
  @concurrent
  public func save(_ entry: Entry, on date: EntryDate) async throws(AppError) -> Entry {
    let font = entry.font.map(CoreBindings.EntryFont.init)
    return Entry(
      try await call { try handle.saveEntry(date: date.text, body: entry.body, font: font) })
  }

  /// Reads the folder of entries, so it leaves the main actor.
  @concurrent
  public func entryDates() async throws(AppError) -> [EntryDate] {
    try await call { try handle.entryDates() }.map(EntryDate.init(coreText:))
  }
}

extension Core: EntryHost {
  /// Encrypts and writes a file, so it leaves the main actor.
  @concurrent
  public func saveImage(_ picture: Data) async throws(AppError) -> String {
    try await call { try handle.saveImage(picture: picture) }
  }

  /// Reads and decrypts a file, so it leaves the main actor.
  @concurrent
  public func image(id: String) async throws(AppError) -> Data {
    try await call { try handle.readImage(id: id) }
  }

  public func linkPage(at url: String) async throws(AppError) -> LinkPage {
    LinkPage(try await call { try await CoreBindings.linkPage(url: url) })
  }

  public func linkImage(at url: String) async throws(AppError) -> Data {
    try await call { try await CoreBindings.linkImage(url: url) }
  }

  public func embedPagesOrigin() async throws(AppError) -> String {
    try await call { try handle.embedPagesOrigin() }
  }
}

private let log = Logger(subsystem: Bundle.main.bundleIdentifier ?? "Hush", category: "core")

/// Runs a call that can fail, logging the core's reason before it is
/// reduced to an `AppError`.
private func call<T>(_ body: () async throws -> T) async throws(AppError) -> T {
  do {
    return try await body()
  } catch let CoreFailure.Core(kind, reason) {
    log.error("\(reason, privacy: .public)")
    throw AppError(kind)
  } catch {
    preconditionFailure("the core fails only with CoreFailure, not \(error)")
  }
}

extension AppError {
  fileprivate init(_ kind: CoreErrorKind) {
    switch kind {
    case .emptyPassphrase: self = .emptyPassphrase
    case .wrongPassphrase: self = .wrongPassphrase
    case .wrongPassphraseOrSecretKey: self = .wrongPassphraseOrSecretKey
    case .invalidSecretKey: self = .invalidSecretKey
    case .noSecretKey: self = .noSecretKey
    case .newerVaultVersion: self = .newerVault
    case .outdatedVault: self = .outdatedVault
    case .brokenVault: self = .brokenVault
    case .keychain: self = .keychain
    case .newerEntryVersion: self = .newerEntry
    case .brokenEntry: self = .brokenEntry
    case .unsupportedPicture: self = .unsupportedPicture
    case .newerImageVersion: self = .newerImage
    case .brokenImage: self = .brokenImage
    case .invalidImageId: self = .invalidImageId
    case .noImage: self = .noImage
    case .link: self = .link
    case .unreadableLink: self = .unreadableLink
    case .embedPages: self = .embedPages
    case .noBiometry: self = .noBiometry
    case .biometryCancelled: self = .biometryCancelled
    case .biometryFailed: self = .biometryFailed
    case .biometricKeychain: self = .biometricKeychain
    case .noKeptKey: self = .noKeptKey
    case .keyDerivation, .decryption, .encryption, .random, .invalidDate, .noVault, .vaultExists,
      .locked, .io:
      self = .unexpected
    }
  }
}
