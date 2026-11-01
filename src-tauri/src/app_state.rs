use std::sync::Mutex;

use crate::crypto::VaultKey;
use crate::local_store::LocalStore;

pub struct AppStateInner {
    pub store: LocalStore,
    /// `Some` while unlocked. Locking drops the key, which wipes it.
    pub key: Option<VaultKey>,
}

pub type AppState = Mutex<AppStateInner>;
