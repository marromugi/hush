use std::fmt;

use zeroize::Zeroizing;

use crate::core_error::CoreError;
use crate::secret_key::SecretKey;

/// Where this device keeps each vault's Secret Key, by vault id.
pub trait SecretKeyStore: fmt::Debug + Send + Sync {
    /// `None` when this device has no usable Secret Key for the vault.
    fn get(&self, vault_id: &str) -> Result<Option<SecretKey>, CoreError>;
    fn set(&self, vault_id: &str, key: &SecretKey) -> Result<(), CoreError>;
}

/// The operating system's keychain: the login keychain on macOS, the
/// app's keychain on iOS.
#[derive(Debug)]
pub struct Keychain;

const SERVICE: &str = "dev.marromugi.hush.secret-key";

impl SecretKeyStore for Keychain {
    fn get(&self, vault_id: &str) -> Result<Option<SecretKey>, CoreError> {
        let entry = keyring::Entry::new(SERVICE, vault_id).map_err(CoreError::Keychain)?;
        match entry.get_secret().map(Zeroizing::new) {
            // An item that is not a Secret Key is as good as none: the person
            // types the key, and the typed key replaces it once it opens the vault.
            Ok(bytes) => Ok(SecretKey::from_bytes(&bytes)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(CoreError::Keychain(e)),
        }
    }

    fn set(&self, vault_id: &str, key: &SecretKey) -> Result<(), CoreError> {
        keyring::Entry::new(SERVICE, vault_id)
            .and_then(|entry| entry.set_secret(key.as_bytes()))
            .map_err(CoreError::Keychain)
    }
}

/// A keychain that fails every read and write, for tests.
#[cfg(test)]
#[derive(Debug)]
pub struct BrokenKeychain;

#[cfg(test)]
impl SecretKeyStore for BrokenKeychain {
    fn get(&self, _: &str) -> Result<Option<SecretKey>, CoreError> {
        Err(CoreError::Keychain(keyring::Error::NoStorageAccess(
            "denied".into(),
        )))
    }

    fn set(&self, _: &str, _: &SecretKey) -> Result<(), CoreError> {
        Err(CoreError::Keychain(keyring::Error::NoStorageAccess(
            "denied".into(),
        )))
    }
}

/// A keychain held in memory, for tests.
#[cfg(test)]
#[derive(Debug, Default)]
pub struct MemoryKeychain(std::sync::Mutex<std::collections::HashMap<String, Vec<u8>>>);

#[cfg(test)]
impl SecretKeyStore for MemoryKeychain {
    fn get(&self, vault_id: &str) -> Result<Option<SecretKey>, CoreError> {
        let keys = self.0.lock().unwrap();
        Ok(keys
            .get(vault_id)
            .map(|bytes| SecretKey::from_bytes(bytes).unwrap()))
    }

    fn set(&self, vault_id: &str, key: &SecretKey) -> Result<(), CoreError> {
        let mut keys = self.0.lock().unwrap();
        keys.insert(vault_id.to_string(), key.as_bytes().to_vec());
        Ok(())
    }
}
