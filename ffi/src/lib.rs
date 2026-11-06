//! The entrance Swift calls. It speaks in `hush-core`'s types and adds no
//! behaviour of its own.

use std::path::PathBuf;
use std::sync::Arc;

use hush_core::app_state::{AppState, AppStateInner};
use hush_core::keychain::Keychain;
use hush_core::local_store::LocalStore;
use hush_core::session::{self, VaultStatus};

uniffi::setup_scaffolding!();

#[uniffi::remote(Enum)]
pub enum VaultStatus {
    Missing,
    NeedsSecretKey,
    Locked,
    Unlocked,
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
}
