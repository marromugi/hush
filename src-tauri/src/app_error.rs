use hush_core::core_error::CoreError;
use serde::ser::SerializeStruct;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error(transparent)]
    Core(#[from] CoreError),

    /// Not allowed, not answered in time, or no such playlist.
    #[error("the music app did not play the playlist")]
    Music,

    #[error("app runtime failed")]
    Tauri(#[from] tauri::Error),
}

impl AppError {
    /// What the frontend branches on.
    fn kind(&self) -> &'static str {
        match self {
            Self::Core(error) => core_kind(error),
            Self::Music => "music",
            Self::Tauri(_) => "tauri",
        }
    }

    /// This error's text followed by each underlying error's text.
    fn debug_message(&self) -> String {
        let mut message = self.to_string();
        let mut source = std::error::Error::source(self);
        while let Some(error) = source {
            message.push_str(": ");
            message.push_str(&error.to_string());
            source = error.source();
        }
        message
    }
}

fn core_kind(error: &CoreError) -> &'static str {
    match error {
        CoreError::KeyDerivation(_) => "keyDerivation",
        CoreError::Decryption => "decryption",
        CoreError::Encryption => "encryption",
        CoreError::Random(_) => "random",
        CoreError::WrongPassphrase => "wrongPassphrase",
        CoreError::WrongPassphraseOrSecretKey => "wrongPassphraseOrSecretKey",
        CoreError::InvalidSecretKey => "invalidSecretKey",
        CoreError::NoSecretKey => "noSecretKey",
        CoreError::Keychain(_) => "keychain",
        CoreError::OutdatedVault(_) => "outdatedVault",
        CoreError::NoBiometry => "noBiometry",
        CoreError::BiometryCancelled => "biometryCancelled",
        CoreError::BiometryFailed => "biometryFailed",
        CoreError::BiometricKeychain(_) => "biometricKeychain",
        CoreError::NoKeptKey => "noKeptKey",
        CoreError::EmptyPassphrase => "emptyPassphrase",
        CoreError::NewerVaultVersion(_) => "newerVaultVersion",
        CoreError::BrokenVault(_) => "brokenVault",
        CoreError::NewerEntryVersion(_) => "newerEntryVersion",
        CoreError::BrokenEntry(_) => "brokenEntry",
        CoreError::InvalidDate(_) => "invalidDate",
        CoreError::NewerImageVersion(_) => "newerImageVersion",
        CoreError::BrokenImage(_) => "brokenImage",
        CoreError::InvalidImageId(_) => "invalidImageId",
        CoreError::NoImage => "noImage",
        CoreError::UnsupportedPicture => "unsupportedPicture",
        CoreError::NoVault => "noVault",
        CoreError::VaultExists => "vaultExists",
        CoreError::Locked => "locked",
        CoreError::EmbedPages => "embedPages",
        CoreError::Link(_) => "link",
        CoreError::UnreadableLink => "unreadableLink",
        CoreError::Io(_) => "io",
    }
}

/// Reaches the frontend as `{ kind, message }`. The frontend picks its words
/// from `kind`; `message` is for debugging only.
impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut s = serializer.serialize_struct("AppError", 2)?;
        s.serialize_field("kind", self.kind())?;
        s.serialize_field("message", &self.debug_message())?;
        s.end()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reaches_the_frontend_as_kind_and_message_with_its_cause() {
        let io = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "denied");
        let value = serde_json::to_value(AppError::Core(CoreError::Io(io))).unwrap();
        assert_eq!(value["kind"], "io");
        assert_eq!(value["message"], "file access failed: denied");
    }

    /// The frontend branches on these strings; changing one breaks it.
    #[test]
    fn kinds_the_frontend_branches_on() {
        let cases = [
            (CoreError::WrongPassphrase.into(), "wrongPassphrase"),
            (CoreError::EmptyPassphrase.into(), "emptyPassphrase"),
            (CoreError::NoVault.into(), "noVault"),
            (CoreError::VaultExists.into(), "vaultExists"),
            (CoreError::Locked.into(), "locked"),
            (AppError::Music, "music"),
            (CoreError::UnreadableLink.into(), "unreadableLink"),
            (CoreError::InvalidDate(String::new()).into(), "invalidDate"),
            (CoreError::NewerVaultVersion(2).into(), "newerVaultVersion"),
            (CoreError::NewerEntryVersion(2).into(), "newerEntryVersion"),
            (CoreError::Decryption.into(), "decryption"),
            (
                CoreError::WrongPassphraseOrSecretKey.into(),
                "wrongPassphraseOrSecretKey",
            ),
            (CoreError::InvalidSecretKey.into(), "invalidSecretKey"),
            (CoreError::NoSecretKey.into(), "noSecretKey"),
            (CoreError::BiometryCancelled.into(), "biometryCancelled"),
            (CoreError::BiometryFailed.into(), "biometryFailed"),
            (CoreError::NoKeptKey.into(), "noKeptKey"),
            (CoreError::OutdatedVault(1).into(), "outdatedVault"),
            (CoreError::NewerImageVersion(2).into(), "newerImageVersion"),
            (
                CoreError::InvalidImageId(String::new()).into(),
                "invalidImageId",
            ),
            (CoreError::NoImage.into(), "noImage"),
            (CoreError::UnsupportedPicture.into(), "unsupportedPicture"),
        ];
        for (error, kind) in cases {
            assert_eq!(serde_json::to_value(error).unwrap()["kind"], kind);
        }
    }
}
