use std::time::{SystemTime, UNIX_EPOCH};

use tauri::State;
use tauri::async_runtime::spawn_blocking;
use tauri::ipc::{InvokeBody, Request, Response};
use zeroize::Zeroizing;

use crate::app_error::AppError;
use crate::app_state::AppState;
use crate::embed_pages;
use crate::entry::EntryFont;
use crate::now_playing::{self, NowPlaying};
use crate::session::{self, BiometryStatus, EntryView, VaultStatus};

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

/// Returns the new vault's Secret Key as text, for the person to keep.
#[tauri::command]
pub async fn create_vault(
    passphrase: String,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let passphrase = Zeroizing::new(passphrase);
    let pending = session::begin_unlock(&state);
    let store = pending.store.clone();
    let (key, secret_key) = spawn_blocking(move || store.create_vault(&passphrase)).await??;
    session::finish_unlock(&state, pending, key)?;
    Ok(secret_key.to_text().to_string())
}

/// `secret_key` is typed only on a device that does not have it yet.
#[tauri::command]
pub async fn unlock_vault(
    passphrase: String,
    secret_key: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let passphrase = Zeroizing::new(passphrase);
    let secret_key = secret_key.map(Zeroizing::new);
    let pending = session::begin_unlock(&state);
    let store = pending.store.clone();
    let key = spawn_blocking(move || {
        store.unlock(&passphrase, secret_key.as_deref().map(String::as_str))
    })
    .await??;
    session::finish_unlock(&state, pending, key)
}

/// Asks for Touch ID or Face ID, showing `reason` where the system has room
/// for it, and opens the vault with the key kept behind it.
#[tauri::command]
pub async fn unlock_with_biometry(
    reason: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let pending = session::begin_unlock(&state);
    let store = pending.store.clone();
    // The prompt waits for the person, so it must not hold an async thread.
    let key = spawn_blocking(move || store.unlock_with_biometry(&reason)).await??;
    session::finish_unlock(&state, pending, key)
}

#[tauri::command]
pub async fn biometry_status(state: State<'_, AppState>) -> Result<BiometryStatus, AppError> {
    session::biometry_status(&state)
}

#[tauri::command]
pub async fn turn_on_biometry(state: State<'_, AppState>) -> Result<(), AppError> {
    session::turn_on_biometry(&state)
}

#[tauri::command]
pub async fn turn_off_biometry(state: State<'_, AppState>) -> Result<(), AppError> {
    session::turn_off_biometry(&state)
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
    font: Option<EntryFont>,
    state: State<'_, AppState>,
) -> Result<EntryView, AppError> {
    session::save_entry(&state, date, body, font, now_ms())
}

#[tauri::command]
pub async fn list_entry_dates(state: State<'_, AppState>) -> Result<Vec<String>, AppError> {
    session::entry_dates(&state)
}

#[tauri::command]
pub async fn embed_pages_origin(state: State<'_, AppState>) -> Result<String, AppError> {
    embed_pages::origin(&state)
}

/// The Secret Key as text, for the person to keep again.
#[tauri::command]
pub async fn show_secret_key(state: State<'_, AppState>) -> Result<String, AppError> {
    session::secret_key_text(&state)
}

/// The picture is the request's raw body, a JPEG, PNG, or GIF. Returns the new image's id.
#[tauri::command]
pub async fn save_image(
    request: Request<'_>,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(AppError::UnsupportedPicture);
    };
    session::save_image(&state, bytes.clone())
}

/// The picture saved as `id`, as raw bytes.
#[tauri::command]
pub async fn read_image(id: String, state: State<'_, AppState>) -> Result<Response, AppError> {
    Ok(Response::new(session::read_image(&state, id)?))
}

/// What the Music app plays now; later changes come as `NOW_PLAYING_CHANGED`.
#[tauri::command]
pub async fn now_playing() -> Result<Option<NowPlaying>, AppError> {
    Ok(spawn_blocking(now_playing::read).await?)
}
