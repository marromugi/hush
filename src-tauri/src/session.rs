use std::sync::MutexGuard;

use serde::Serialize;

use crate::app_error::AppError;
use crate::app_state::{AppState, AppStateInner};
use crate::crypto::VaultKey;
use crate::entry::{Entry, EntryDate};
use crate::local_store::LocalStore;

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum VaultStatus {
    Missing,
    Locked,
    Unlocked,
}

/// An entry as the frontend sees it.
#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryView {
    pub date: String,
    pub body: String,
    pub created_at_ms: u64,
    pub updated_at_ms: u64,
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

/// What an unlock or vault creation needs to do its slow work without
/// holding the state lock.
pub struct Pending {
    pub store: LocalStore,
    lock_count: u64,
}

fn inner(state: &AppState) -> MutexGuard<'_, AppStateInner> {
    state
        .lock()
        .expect("state lock is only poisoned by an earlier panic")
}

pub fn status(state: &AppState) -> VaultStatus {
    let inner = inner(state);
    if inner.key.is_some() {
        VaultStatus::Unlocked
    } else if inner.store.has_vault() {
        VaultStatus::Locked
    } else {
        VaultStatus::Missing
    }
}

pub fn begin_unlock(state: &AppState) -> Pending {
    let inner = inner(state);
    Pending {
        store: inner.store.clone(),
        lock_count: inner.lock_count,
    }
}

/// Keeps `key` unless the vault was locked while it was being derived.
pub fn finish_unlock(state: &AppState, pending: Pending, key: VaultKey) -> Result<(), AppError> {
    let mut inner = inner(state);
    if inner.lock_count != pending.lock_count {
        return Err(AppError::Locked);
    }
    inner.key = Some(key);
    Ok(())
}

pub fn lock(state: &AppState) {
    let mut inner = inner(state);
    inner.key = None;
    inner.lock_count += 1;
}

pub fn read_entry(state: &AppState, date: String) -> Result<Option<EntryView>, AppError> {
    let date = parse_date(date)?;
    let inner = inner(state);
    let key = inner.key.as_ref().ok_or(AppError::Locked)?;
    Ok(inner.store.read_entry(key, &date)?.map(EntryView::from))
}

pub fn save_entry(
    state: &AppState,
    date: String,
    body: String,
    now_ms: u64,
) -> Result<EntryView, AppError> {
    let date = parse_date(date)?;
    let inner = inner(state);
    let key = inner.key.as_ref().ok_or(AppError::Locked)?;
    Ok(inner.store.save_entry(key, &date, body, now_ms)?.into())
}

/// Every date that has an entry, oldest first, as `YYYY-MM-DD`.
pub fn entry_dates(state: &AppState) -> Result<Vec<String>, AppError> {
    let inner = inner(state);
    inner.key.as_ref().ok_or(AppError::Locked)?;
    Ok(inner
        .store
        .entry_dates()?
        .into_iter()
        .map(String::from)
        .collect())
}

fn parse_date(date: String) -> Result<EntryDate, AppError> {
    EntryDate::try_from(date).map_err(AppError::InvalidDate)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state() -> (tempfile::TempDir, AppState) {
        let dir = tempfile::tempdir().unwrap();
        let store = LocalStore::new(dir.path().to_path_buf());
        (dir, AppState::new(AppStateInner::new(store)))
    }

    fn create_and_unlock(state: &AppState, passphrase: &str) {
        let pending = begin_unlock(state);
        let key = pending.store.create_vault(passphrase).unwrap();
        finish_unlock(state, pending, key).unwrap();
    }

    #[test]
    fn status_follows_create_lock_and_unlock() {
        let (_dir, state) = state();
        assert_eq!(status(&state), VaultStatus::Missing);
        create_and_unlock(&state, "correct horse");
        assert_eq!(status(&state), VaultStatus::Unlocked);
        lock(&state);
        assert_eq!(status(&state), VaultStatus::Locked);
    }

    #[test]
    fn locking_drops_the_key() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        lock(&state);
        assert!(inner(&state).key.is_none());
        assert!(matches!(
            read_entry(&state, "2026-10-29".to_string()),
            Err(AppError::Locked)
        ));
    }

    #[test]
    fn a_lock_during_an_unlock_wins() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        lock(&state);

        let pending = begin_unlock(&state);
        let key = pending.store.unlock("correct horse").unwrap();
        lock(&state); // the user locks while the key is being derived
        assert!(matches!(
            finish_unlock(&state, pending, key),
            Err(AppError::Locked)
        ));
        assert_eq!(status(&state), VaultStatus::Locked);
    }

    #[test]
    fn saving_needs_an_unlocked_vault() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        lock(&state);
        assert!(matches!(
            save_entry(&state, "2026-10-29".to_string(), "b".to_string(), 1),
            Err(AppError::Locked)
        ));
    }

    #[test]
    fn listing_dates_needs_an_unlocked_vault() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        save_entry(&state, "2026-10-29".to_string(), "b".to_string(), 1).unwrap();
        assert_eq!(entry_dates(&state).unwrap(), ["2026-10-29"]);
        lock(&state);
        assert!(matches!(entry_dates(&state), Err(AppError::Locked)));
    }

    #[test]
    fn a_saved_entry_reads_back_as_the_frontend_sees_it() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        save_entry(&state, "2026-10-29".to_string(), "晴れ".to_string(), 5).unwrap();
        assert_eq!(
            read_entry(&state, "2026-10-29".to_string()).unwrap(),
            Some(EntryView {
                date: "2026-10-29".to_string(),
                body: "晴れ".to_string(),
                created_at_ms: 5,
                updated_at_ms: 5,
            })
        );
    }

    #[test]
    fn a_malformed_date_from_the_frontend_is_refused() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        assert!(matches!(
            read_entry(&state, "../../vault".to_string()),
            Err(AppError::InvalidDate(_))
        ));
    }

    #[test]
    fn the_frontend_sees_camel_case_names() {
        let view = EntryView {
            date: "2026-10-29".to_string(),
            body: String::new(),
            created_at_ms: 1,
            updated_at_ms: 2,
        };
        let value = serde_json::to_value(view).unwrap();
        assert_eq!(value["createdAtMs"], 1);
        assert_eq!(value["updatedAtMs"], 2);
        assert_eq!(
            serde_json::to_value(VaultStatus::Missing).unwrap(),
            "missing"
        );
    }
}
