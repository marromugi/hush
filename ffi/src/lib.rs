//! The entrance Swift calls. It speaks in `hush-core`'s types and adds no
//! behaviour of its own; a failure arrives as a `CoreFailure`.

mod core_failure;

use std::path::PathBuf;
use std::sync::Arc;

use hush_core::app_state::{AppState, AppStateInner};
use hush_core::entry::EntryFont;
use hush_core::keychain::Keychain;
use hush_core::local_store::LocalStore;
use hush_core::session::{self, EntryView, VaultStatus};
use zeroize::Zeroizing;

use core_failure::CoreFailure;

uniffi::setup_scaffolding!();

#[uniffi::remote(Enum)]
pub enum VaultStatus {
    Missing,
    NeedsSecretKey,
    Locked,
    Unlocked,
}

#[uniffi::remote(Record)]
pub struct EntryView {
    pub date: String,
    pub body: String,
    pub created_at_ms: u64,
    pub updated_at_ms: u64,
    pub font: Option<EntryFont>,
}

#[uniffi::remote(Record)]
pub struct EntryFont {
    pub id: String,
    pub family: String,
    pub category: String,
    pub stylesheet: String,
}

/// One per app run, holding the vault's state for this device.
#[derive(uniffi::Object)]
pub struct CoreHandle {
    state: AppState,
}

#[uniffi::export]
impl CoreHandle {
    /// `data_dir` is where the vault and its entries are kept.
    #[uniffi::constructor]
    pub fn new(data_dir: String) -> Arc<Self> {
        let store = LocalStore::new(PathBuf::from(data_dir), Arc::new(Keychain));
        #[cfg(target_os = "ios")]
        let store = store.with_vault_keys(Arc::new(hush_core::biometry::BiometricKeychain));
        Arc::new(CoreHandle {
            state: AppState::new(AppStateInner::new(store)),
        })
    }

    pub fn vault_status(&self) -> VaultStatus {
        session::status(&self.state)
    }

    /// Makes a new vault and opens it. Returns its Secret Key as text, for
    /// the person to keep. Deriving the key is slow on purpose.
    pub fn create_vault(&self, passphrase: String) -> Result<String, CoreFailure> {
        let passphrase = Zeroizing::new(passphrase);
        let pending = session::begin_unlock(&self.state);
        let (key, secret_key) = pending.store.create_vault(&passphrase)?;
        session::finish_unlock(&self.state, pending, key)?;
        Ok(secret_key.to_text().to_string())
    }

    /// `secret_key` is typed only on a device that does not have it yet.
    /// Deriving the key is slow on purpose.
    pub fn unlock_vault(
        &self,
        passphrase: String,
        secret_key: Option<String>,
    ) -> Result<(), CoreFailure> {
        let passphrase = Zeroizing::new(passphrase);
        let secret_key = secret_key.map(Zeroizing::new);
        let pending = session::begin_unlock(&self.state);
        let key = pending
            .store
            .unlock(&passphrase, secret_key.as_deref().map(String::as_str))?;
        Ok(session::finish_unlock(&self.state, pending, key)?)
    }

    pub fn lock_vault(&self) {
        session::lock(&self.state);
    }

    /// `None` when nothing was written on `date` (`YYYY-MM-DD`).
    pub fn read_entry(&self, date: String) -> Result<Option<EntryView>, CoreFailure> {
        Ok(session::read_entry(&self.state, date)?)
    }

    /// Stores `body` and `font` as the entry for `date` (`YYYY-MM-DD`), and
    /// returns the entry as stored.
    pub fn save_entry(
        &self,
        date: String,
        body: String,
        font: Option<EntryFont>,
    ) -> Result<EntryView, CoreFailure> {
        Ok(session::save_entry(
            &self.state,
            date,
            body,
            font,
            session::now_ms(),
        )?)
    }
}
