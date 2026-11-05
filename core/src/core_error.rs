#[derive(Debug, thiserror::Error)]
pub enum CoreError {
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

    /// The Secret Key was typed, so either of the two can be the wrong one.
    #[error("wrong passphrase or secret key")]
    WrongPassphraseOrSecretKey,

    #[error("text is not a secret key")]
    InvalidSecretKey,

    #[error("this device has no secret key for the vault")]
    NoSecretKey,

    #[error("keychain access failed")]
    Keychain(#[source] keyring::Error),

    #[error("this device has no Touch ID or Face ID set up")]
    NoBiometry,

    /// The person cancelled Touch ID or Face ID.
    #[error("touch id or face id was cancelled")]
    BiometryCancelled,

    /// Touch ID or Face ID failed too many times, and is locked until the
    /// device passcode is entered.
    #[error("touch id or face id failed")]
    BiometryFailed,

    #[error("keychain access for touch id or face id failed with status {0}")]
    BiometricKeychain(i32),

    /// No key is kept for Touch ID or Face ID, or the kept one no longer
    /// opens the vault.
    #[error("no key is kept for touch id or face id")]
    NoKeptKey,

    #[error("passphrase is empty")]
    EmptyPassphrase,

    #[error("vault.json is version {0}, newer than this app")]
    NewerVaultVersion(u32),

    #[error("vault.json is version {0}, from before secret keys")]
    OutdatedVault(u32),

    #[error("vault.json is broken")]
    BrokenVault(#[source] serde_json::Error),

    #[error("entry file is version {0}, newer than this app")]
    NewerEntryVersion(u32),

    #[error("entry file is broken")]
    BrokenEntry(#[source] serde_json::Error),

    #[error("{0}")]
    InvalidDate(String),

    #[error("image file is version {0}, newer than this app")]
    NewerImageVersion(u32),

    #[error("image file is broken")]
    BrokenImage(#[source] serde_json::Error),

    #[error("{0}")]
    InvalidImageId(String),

    #[error("no image file with this id")]
    NoImage,

    #[error("picture is not a JPEG, PNG, or GIF")]
    UnsupportedPicture,

    #[error("no vault yet")]
    NoVault,

    #[error("a vault already exists")]
    VaultExists,

    #[error("vault is locked")]
    Locked,

    #[error("the server for video pages is not running")]
    EmbedPages,

    /// The link's site could not be reached, did not answer in time, or answered with an error.
    #[error("link could not be fetched")]
    Link(#[from] reqwest::Error),

    /// Not an `http` or `https` link, or its picture is too large.
    #[error("link cannot be read")]
    UnreadableLink,

    #[error("file access failed")]
    Io(#[from] std::io::Error),
}
