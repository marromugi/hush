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
}
