use std::sync::MutexGuard;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::State;
use tauri::async_runtime::spawn_blocking;
use zeroize::Zeroizing;

use crate::app_error::AppError;
use crate::app_state::{AppState, AppStateInner};
use crate::entry::{Entry, EntryDate};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum VaultStatus {
    Missing,
    Locked,
    Unlocked,
}

/// An entry as the frontend sees it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryView {
    date: String,
    body: String,
    created_at_ms: u64,
    updated_at_ms: u64,
}

impl From<Entry> for EntryView {
    fn from(entry: Entry) -> Self {
        EntryView {
            date: entry.date.into(),
            body: entry.body,
            created_at_ms: entry.created_at_ms,
            updated_at_ms: entry.updated_at_ms,
        }
    }
}

fn lock(state: &AppState) -> MutexGuard<'_, AppStateInner> {
    state
        .lock()
        .expect("state lock is only poisoned by an earlier panic")
}

fn parse_date(date: String) -> Result<EntryDate, AppError> {
    EntryDate::try_from(date).map_err(AppError::InvalidDate)
}

fn now_ms() -> u64 {
    let since_epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("the clock is after 1970");
    u64::try_from(since_epoch.as_millis()).expect("milliseconds since 1970 fit in u64")
}

#[tauri::command]
pub async fn vault_status(state: State<'_, AppState>) -> Result<VaultStatus, AppError> {
    let inner = lock(&state);
    Ok(if inner.key.is_some() {
        VaultStatus::Unlocked
    } else if inner.store.has_vault() {
        VaultStatus::Locked
    } else {
        VaultStatus::Missing
    })
}

#[tauri::command]
pub async fn create_vault(passphrase: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let passphrase = Zeroizing::new(passphrase);
    let store = lock(&state).store.clone();
    let key = spawn_blocking(move || store.create_vault(&passphrase)).await??;
    lock(&state).key = Some(key);
    Ok(())
}

#[tauri::command]
pub async fn unlock_vault(passphrase: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let passphrase = Zeroizing::new(passphrase);
    let store = lock(&state).store.clone();
    let key = spawn_blocking(move || store.unlock(&passphrase)).await??;
    lock(&state).key = Some(key);
    Ok(())
}

#[tauri::command]
pub async fn lock_vault(state: State<'_, AppState>) -> Result<(), AppError> {
    lock(&state).key = None;
    Ok(())
}

#[tauri::command]
pub async fn read_entry(
    date: String,
    state: State<'_, AppState>,
) -> Result<Option<EntryView>, AppError> {
    let date = parse_date(date)?;
    let inner = lock(&state);
    let key = inner.key.as_ref().ok_or(AppError::Locked)?;
    Ok(inner.store.read_entry(key, &date)?.map(EntryView::from))
}

#[tauri::command]
pub async fn save_entry(
    date: String,
    body: String,
    state: State<'_, AppState>,
) -> Result<EntryView, AppError> {
    let date = parse_date(date)?;
    let inner = lock(&state);
    let key = inner.key.as_ref().ok_or(AppError::Locked)?;
    Ok(inner.store.save_entry(key, &date, body, now_ms())?.into())
}
