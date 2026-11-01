use std::time::{SystemTime, UNIX_EPOCH};

use tauri::State;
use tauri::async_runtime::spawn_blocking;
use zeroize::Zeroizing;

use crate::app_error::AppError;
use crate::app_state::AppState;
use crate::session::{self, EntryView, VaultStatus};

fn now_ms() -> u64 {
    let since_epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("the clock is after 1970");
    u64::try_from(since_epoch.as_millis()).expect("milliseconds since 1970 fit in u64")
}

#[tauri::command]
pub async fn vault_status(state: State<'_, AppState>) -> Result<VaultStatus, AppError> {
    Ok(session::status(&state))
}

#[tauri::command]
pub async fn create_vault(passphrase: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let passphrase = Zeroizing::new(passphrase);
    let pending = session::begin_unlock(&state);
    let store = pending.store.clone();
    let key = spawn_blocking(move || store.create_vault(&passphrase)).await??;
    session::finish_unlock(&state, pending, key)
}

#[tauri::command]
pub async fn unlock_vault(passphrase: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let passphrase = Zeroizing::new(passphrase);
    let pending = session::begin_unlock(&state);
    let store = pending.store.clone();
    let key = spawn_blocking(move || store.unlock(&passphrase)).await??;
    session::finish_unlock(&state, pending, key)
}

#[tauri::command]
pub async fn lock_vault(state: State<'_, AppState>) -> Result<(), AppError> {
    session::lock(&state);
    Ok(())
}

#[tauri::command]
pub async fn read_entry(
    date: String,
    state: State<'_, AppState>,
) -> Result<Option<EntryView>, AppError> {
    session::read_entry(&state, date)
}

#[tauri::command]
pub async fn save_entry(
    date: String,
    body: String,
    state: State<'_, AppState>,
) -> Result<EntryView, AppError> {
    session::save_entry(&state, date, body, now_ms())
}
