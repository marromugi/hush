#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("key derivation failed")]
    KeyDerivation(#[source] argon2::Error),

    /// Wrong key, wrong file path, or a ciphertext that was altered. The cipher
    /// does not say which, by design.
    #[error("decryption failed")]
    Decryption,

    #[error("encryption failed")]
    Encryption,

    #[error("system random number generator failed")]
    Random(#[source] getrandom::Error),

    #[error("wrong passphrase")]
    WrongPassphrase,

    #[error("vault.json is version {0}, newer than this app")]
    NewerVaultVersion(u32),

    #[error("vault.json is broken")]
    BrokenVault(#[source] serde_json::Error),

    #[error("entry file is version {0}, newer than this app")]
    NewerEntryVersion(u32),

    #[error("entry file is broken")]
    BrokenEntry(#[source] serde_json::Error),
}
