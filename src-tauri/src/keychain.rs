use std::fmt;

use zeroize::Zeroizing;

use crate::app_error::AppError;
use crate::secret_key::SecretKey;

/// Where this device keeps each vault's Secret Key, by vault id.
pub trait SecretKeyStore: fmt::Debug + Send + Sync {
    /// `None` when this device has no Secret Key for the vault.
    fn get(&self, vault_id: &str) -> Result<Option<SecretKey>, AppError>;
    fn set(&self, vault_id: &str, key: &SecretKey) -> Result<(), AppError>;
}

/// The operating system's keychain: the login keychain on macOS, the
/// app's keychain on iOS.
#[derive(Debug)]
pub struct Keychain;

const SERVICE: &str = "dev.marromugi.hush.secret-key";

impl SecretKeyStore for Keychain {
    fn get(&self, vault_id: &str) -> Result<Option<SecretKey>, AppError> {
        let entry = keyring::Entry::new(SERVICE, vault_id).map_err(AppError::Keychain)?;
        match entry.get_secret().map(Zeroizing::new) {
            Ok(bytes) => SecretKey::from_bytes(&bytes).map(Some).ok_or_else(|| {
                AppError::Keychain(keyring::Error::Invalid(
                    "secret".to_string(),
                    format!("{} bytes, not a Secret Key", bytes.len()),
                ))
            }),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(AppError::Keychain(e)),
        }
    }

    fn set(&self, vault_id: &str, key: &SecretKey) -> Result<(), AppError> {
        keyring::Entry::new(SERVICE, vault_id)
            .and_then(|entry| entry.set_secret(key.as_bytes()))
            .map_err(AppError::Keychain)
    }
}

/// A keychain held in memory, for tests.
#[cfg(test)]
#[derive(Debug, Default)]
pub struct MemoryKeychain(std::sync::Mutex<std::collections::HashMap<String, Vec<u8>>>);

#[cfg(test)]
impl SecretKeyStore for MemoryKeychain {
    fn get(&self, vault_id: &str) -> Result<Option<SecretKey>, AppError> {
        let keys = self.0.lock().unwrap();
        Ok(keys
            .get(vault_id)
            .map(|bytes| SecretKey::from_bytes(bytes).unwrap()))
    }

    fn set(&self, vault_id: &str, key: &SecretKey) -> Result<(), AppError> {
        let mut keys = self.0.lock().unwrap();
        keys.insert(vault_id.to_string(), key.as_bytes().to_vec());
        Ok(())
    }
}
