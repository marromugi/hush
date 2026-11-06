use hush_core::core_error::CoreError;

/// How a call into the core failed, as Swift receives it.
#[derive(Debug, uniffi::Error)]
pub enum CoreFailure {
    /// `reason` is the error's text followed by the text of each error under it.
    Core { kind: CoreErrorKind, reason: String },
}

impl From<CoreError> for CoreFailure {
    fn from(error: CoreError) -> Self {
        CoreFailure::Core {
            kind: CoreErrorKind::from(&error),
            reason: reason(&error),
        }
    }
}

impl std::fmt::Display for CoreFailure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let CoreFailure::Core { reason, .. } = self;
        f.write_str(reason)
    }
}

impl std::error::Error for CoreFailure {}

fn reason(error: &CoreError) -> String {
    let mut reason = error.to_string();
    let mut source = std::error::Error::source(error);
    while let Some(error) = source {
        reason.push_str(": ");
        reason.push_str(&error.to_string());
        source = error.source();
    }
    reason
}

/// One case for each `CoreError` variant.
#[derive(Debug, PartialEq, Eq, uniffi::Enum)]
pub enum CoreErrorKind {
    KeyDerivation,
    Decryption,
    Encryption,
    Random,
    WrongPassphrase,
    WrongPassphraseOrSecretKey,
    InvalidSecretKey,
    NoSecretKey,
    Keychain,
    NoBiometry,
    BiometryCancelled,
    BiometryFailed,
    BiometricKeychain,
    NoKeptKey,
    EmptyPassphrase,
    NewerVaultVersion,
    OutdatedVault,
    BrokenVault,
    NewerEntryVersion,
    BrokenEntry,
    InvalidDate,
    NewerImageVersion,
    BrokenImage,
    InvalidImageId,
    NoImage,
    UnsupportedPicture,
    NoVault,
    VaultExists,
    Locked,
    EmbedPages,
    Link,
    UnreadableLink,
    Io,
}

impl From<&CoreError> for CoreErrorKind {
    fn from(error: &CoreError) -> Self {
        match error {
            CoreError::KeyDerivation(_) => Self::KeyDerivation,
            CoreError::Decryption => Self::Decryption,
            CoreError::Encryption => Self::Encryption,
            CoreError::Random(_) => Self::Random,
            CoreError::WrongPassphrase => Self::WrongPassphrase,
            CoreError::WrongPassphraseOrSecretKey => Self::WrongPassphraseOrSecretKey,
            CoreError::InvalidSecretKey => Self::InvalidSecretKey,
            CoreError::NoSecretKey => Self::NoSecretKey,
            CoreError::Keychain(_) => Self::Keychain,
            CoreError::NoBiometry => Self::NoBiometry,
            CoreError::BiometryCancelled => Self::BiometryCancelled,
            CoreError::BiometryFailed => Self::BiometryFailed,
            CoreError::BiometricKeychain(_) => Self::BiometricKeychain,
            CoreError::NoKeptKey => Self::NoKeptKey,
            CoreError::EmptyPassphrase => Self::EmptyPassphrase,
            CoreError::NewerVaultVersion(_) => Self::NewerVaultVersion,
            CoreError::OutdatedVault(_) => Self::OutdatedVault,
            CoreError::BrokenVault(_) => Self::BrokenVault,
            CoreError::NewerEntryVersion(_) => Self::NewerEntryVersion,
            CoreError::BrokenEntry(_) => Self::BrokenEntry,
            CoreError::InvalidDate(_) => Self::InvalidDate,
            CoreError::NewerImageVersion(_) => Self::NewerImageVersion,
            CoreError::BrokenImage(_) => Self::BrokenImage,
            CoreError::InvalidImageId(_) => Self::InvalidImageId,
            CoreError::NoImage => Self::NoImage,
            CoreError::UnsupportedPicture => Self::UnsupportedPicture,
            CoreError::NoVault => Self::NoVault,
            CoreError::VaultExists => Self::VaultExists,
            CoreError::Locked => Self::Locked,
            CoreError::EmbedPages => Self::EmbedPages,
            CoreError::Link(_) => Self::Link,
            CoreError::UnreadableLink => Self::UnreadableLink,
            CoreError::Io(_) => Self::Io,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_reason_carries_the_text_of_the_error_under_it() {
        let error = CoreError::Io(std::io::Error::other("disk is full"));
        let CoreFailure::Core { kind, reason } = CoreFailure::from(error);
        assert_eq!(kind, CoreErrorKind::Io);
        assert_eq!(reason, "file access failed: disk is full");
    }
}
