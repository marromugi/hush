pub mod app_error;
pub mod app_state;
pub mod b64;
pub mod commands;
pub mod crypto;
pub mod entry;
pub mod file_version;
pub mod local_store;
pub mod vault;

use tauri::Manager;

use crate::app_state::{AppState, AppStateInner};
use crate::local_store::LocalStore;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            app.manage(AppState::new(AppStateInner {
                store: LocalStore::new(dir),
                key: None,
            }));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault_status,
            commands::create_vault,
            commands::unlock_vault,
            commands::lock_vault,
            commands::read_entry,
            commands::save_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
