pub mod app_error;
pub mod commands;
pub mod full_screen;
pub mod lock_signals;
pub mod music;
pub mod shake;

use std::sync::Arc;

use tauri::Manager;

use hush_core::app_state::{AppState, AppStateInner};
use hush_core::embed_pages;
use hush_core::keychain::Keychain;
use hush_core::local_store::LocalStore;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Taps felt while pinching the text sample; it does nothing on the desktop.
        .plugin(tauri_plugin_haptics::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let store = LocalStore::new(dir, Arc::new(Keychain));
            #[cfg(target_os = "ios")]
            let store = store.with_vault_keys(Arc::new(hush_core::biometry::BiometricKeychain));
            let mut inner = AppStateInner::new(store);
            // Without it the diary still works; only YouTube videos cannot play.
            inner.embed_pages = embed_pages::start().ok();
            app.manage(AppState::new(inner));
            lock_signals::watch(app.handle());
            full_screen::extend(app)?;
            shake::watch(app.handle())?;
            Ok(())
        })
        .on_window_event(lock_signals::on_window_event)
        .invoke_handler(tauri::generate_handler![
            commands::vault_status,
            commands::create_vault,
            commands::unlock_vault,
            commands::unlock_with_biometry,
            commands::biometry_status,
            commands::turn_on_biometry,
            commands::turn_off_biometry,
            commands::lock_vault,
            commands::read_entry,
            commands::save_entry,
            commands::list_entry_dates,
            commands::embed_pages_origin,
            commands::show_secret_key,
            commands::save_image,
            commands::read_image,
            commands::link_page,
            commands::link_image,
            commands::music_playlists,
            commands::playlist_artwork,
            commands::play_playlist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
