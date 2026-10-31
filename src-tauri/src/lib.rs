pub mod app_error;
pub mod b64;
pub mod crypto;
pub mod entry;
pub mod file_version;
pub mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
