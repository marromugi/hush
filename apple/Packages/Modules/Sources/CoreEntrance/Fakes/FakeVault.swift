#if DEBUG
  /// A vault that answers with the values it is given, for previews and tests.
  public struct FakeVault: Vault {
    public var vaultStatus: VaultStatus
    /// Thrown by `create` and `unlock`; `nil` lets them succeed.
    public var failure: AppError?
    public var secretKey: String

    public init(
      status: VaultStatus,
      failure: AppError? = nil,
      secretKey: String = "H1-ABCDE-FGHJK-MNPQR-STVWX-YZ0123"
    ) {
      vaultStatus = status
      self.failure = failure
      self.secretKey = secretKey
    }

    public func status() async -> VaultStatus {
      vaultStatus
    }

    public func create(passphrase: String) async throws(AppError) -> String {
      if let failure { throw failure }
      return secretKey
    }

    public func unlock(passphrase: String, secretKey: String?) async throws(AppError) {
      if let failure { throw failure }
    }

    public func lock() {}
  }
#endif
