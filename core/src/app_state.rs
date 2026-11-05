use std::sync::Mutex;

use crate::crypto::VaultKey;
use crate::local_store::LocalStore;

pub struct AppStateInner {
    pub store: LocalStore,
    /// `Some` while unlocked. Locking drops the key, which wipes it.
    pub key: Option<VaultKey>,
    /// Advanced by every lock. An unlock that started before a lock sees a
    /// different value when it finishes and is discarded.
    pub lock_count: u64,
    /// Where the pages YouTube videos are shown in are served from; `None`
    /// when the server could not start.
    pub embed_pages: Option<String>,
}

pub type AppState = Mutex<AppStateInner>;

impl AppStateInner {
    pub fn new(store: LocalStore) -> Self {
        AppStateInner {
            store,
            key: None,
            lock_count: 0,
            embed_pages: None,
        }
    }
}
