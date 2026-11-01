use serde::ser::SerializeStruct;

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

    #[error("passphrase is empty")]
    EmptyPassphrase,

    #[error("vault.json is version {0}, newer than this app")]
    NewerVaultVersion(u32),

    #[error("vault.json is broken")]
    BrokenVault(#[source] serde_json::Error),

    #[error("entry file is version {0}, newer than this app")]
    NewerEntryVersion(u32),

    #[error("entry file is broken")]
    BrokenEntry(#[source] serde_json::Error),

    #[error("{0}")]
    InvalidDate(String),

    #[error("no vault yet")]
    NoVault,

    #[error("a vault already exists")]
    VaultExists,

    #[error("vault is locked")]
    Locked,

    #[error("file access failed")]
    Io(#[from] std::io::Error),

    #[error("app runtime failed")]
    Tauri(#[from] tauri::Error),
}

impl AppError {
    /// What the frontend branches on.
    fn kind(&self) -> &'static str {
        match self {
            Self::KeyDerivation(_) => "keyDerivation",
            Self::Decryption => "decryption",
            Self::Encryption => "encryption",
            Self::Random(_) => "random",
            Self::WrongPassphrase => "wrongPassphrase",
            Self::EmptyPassphrase => "emptyPassphrase",
            Self::NewerVaultVersion(_) => "newerVaultVersion",
            Self::BrokenVault(_) => "brokenVault",
            Self::NewerEntryVersion(_) => "newerEntryVersion",
            Self::BrokenEntry(_) => "brokenEntry",
            Self::InvalidDate(_) => "invalidDate",
            Self::NoVault => "noVault",
            Self::VaultExists => "vaultExists",
            Self::Locked => "locked",
            Self::Io(_) => "io",
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
        let value = serde_json::to_value(AppError::Io(io)).unwrap();
        assert_eq!(value["kind"], "io");
        assert_eq!(value["message"], "file access failed: denied");
    }

    /// The frontend branches on these strings; changing one breaks it.
    #[test]
    fn kinds_the_frontend_branches_on() {
        let cases = [
            (AppError::WrongPassphrase, "wrongPassphrase"),
            (AppError::EmptyPassphrase, "emptyPassphrase"),
            (AppError::NoVault, "noVault"),
            (AppError::VaultExists, "vaultExists"),
            (AppError::Locked, "locked"),
            (AppError::InvalidDate(String::new()), "invalidDate"),
            (AppError::NewerVaultVersion(2), "newerVaultVersion"),
            (AppError::NewerEntryVersion(2), "newerEntryVersion"),
            (AppError::Decryption, "decryption"),
        ];
        for (error, kind) in cases {
            assert_eq!(serde_json::to_value(error).unwrap()["kind"], kind);
        }
    }
}
