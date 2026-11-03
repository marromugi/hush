pub mod app_error;
pub mod app_state;
pub mod b64;
pub mod commands;
pub mod crypto;
pub mod embed_pages;
pub mod entry;
pub mod file_version;
pub mod image;
pub mod keychain;
pub mod local_store;
pub mod lock_signals;
pub mod secret_key;
pub mod session;
pub mod vault;

use std::sync::Arc;

use tauri::Manager;

use crate::app_state::{AppState, AppStateInner};
use crate::keychain::Keychain;
use crate::local_store::LocalStore;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let mut inner = AppStateInner::new(LocalStore::new(dir, Arc::new(Keychain)));
            // Without it the diary still works; only YouTube videos cannot play.
            inner.embed_pages = embed_pages::start().ok();
            app.manage(AppState::new(inner));
            lock_signals::watch(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault_status,
            commands::create_vault,
            commands::unlock_vault,
            commands::lock_vault,
            commands::read_entry,
            commands::save_entry,
            commands::list_entry_dates,
            commands::embed_pages_origin,
            commands::show_secret_key,
            commands::save_image,
            commands::read_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
