#if DEBUG
  /// A vault that answers with the values it is given, for previews and tests.
  public actor FakeVault: Vault {
    private let vaultStatus: VaultStatus
    /// Thrown by `create`, `unlock`, and turning Touch ID or Face ID on or
    /// off; `nil` lets them succeed.
    private let failure: AppError?
    private let secretKey: String
    private var biometry: BiometryStatus
    /// Thrown by `unlockWithBiometry`; `nil` lets it succeed.
    private let biometryFailure: AppError?
    /// How many times Touch ID or Face ID was asked for.
    public private(set) var biometryAsks = 0

    public init(
      status: VaultStatus,
      failure: AppError? = nil,
      secretKey: String = "H1-ABCDE-FGHJK-MNPQR-STVWX-YZ0123",
      biometry: BiometryStatus = BiometryStatus(biometry: nil, isOn: false),
      biometryFailure: AppError? = nil
    ) {
      vaultStatus = status
      self.failure = failure
      self.secretKey = secretKey
      self.biometry = biometry
      self.biometryFailure = biometryFailure
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

    public func unlockWithBiometry(reason: String) async throws(AppError) {
      biometryAsks += 1
      if let biometryFailure { throw biometryFailure }
    }

    nonisolated public func lock() {}

    public func biometryStatus() async throws(AppError) -> BiometryStatus {
      biometry
    }

    public func turnOnBiometry() async throws(AppError) {
      if let failure { throw failure }
      biometry.isOn = true
    }

    public func turnOffBiometry() async throws(AppError) {
      if let failure { throw failure }
      biometry.isOn = false
    }
  }
#endif
