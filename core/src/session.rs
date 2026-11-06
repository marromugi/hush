use std::sync::MutexGuard;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use crate::app_state::{AppState, AppStateInner};
use crate::biometry::Biometry;
use crate::core_error::CoreError;
use crate::crypto::VaultKey;
use crate::entry::{Entry, EntryDate, EntryFont};
use crate::image::{ImageId, Picture};
use crate::local_store::LocalStore;

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum VaultStatus {
    Missing,
    /// Locked, and this device has no Secret Key for the vault yet.
    NeedsSecretKey,
    Locked,
    Unlocked,
}

/// Whether this device can open the vault with Touch ID or Face ID, and
/// whether the person has turned it on.
#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BiometryStatus {
    /// `None` when the device has no biometry set up.
    pub biometry: Option<Biometry>,
    pub on: bool,
}

/// An entry as the frontend sees it.
#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryView {
    pub date: String,
    pub body: String,
    pub created_at_ms: u64,
    pub updated_at_ms: u64,
    pub font: Option<EntryFont>,
}

impl From<Entry> for EntryView {
    fn from(entry: Entry) -> Self {
        EntryView {
            date: entry.date.into(),
            body: entry.body,
            created_at_ms: entry.created_at_ms,
            updated_at_ms: entry.updated_at_ms,
            font: entry.font,
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

/// A vault that cannot be read, or a keychain that cannot be read, shows as
/// `Locked`: unlocking then fails with the reason, on a screen that can retry.
pub fn status(state: &AppState) -> VaultStatus {
    let inner = inner(state);
    if inner.key.is_some() {
        VaultStatus::Unlocked
    } else if !inner.store.has_vault() {
        VaultStatus::Missing
    } else if let Ok(false) = inner.store.has_secret_key() {
        VaultStatus::NeedsSecretKey
    } else {
        VaultStatus::Locked
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
pub fn finish_unlock(state: &AppState, pending: Pending, key: VaultKey) -> Result<(), CoreError> {
    let mut inner = inner(state);
    if inner.lock_count != pending.lock_count {
        return Err(CoreError::Locked);
    }
    inner.key = Some(key);
    Ok(())
}

pub fn lock(state: &AppState) {
    let mut inner = inner(state);
    inner.key = None;
    inner.lock_count += 1;
}

pub fn read_entry(state: &AppState, date: String) -> Result<Option<EntryView>, CoreError> {
    let date = parse_date(date)?;
    let inner = inner(state);
    let key = inner.key.as_ref().ok_or(CoreError::Locked)?;
    Ok(inner.store.read_entry(key, &date)?.map(EntryView::from))
}

pub fn save_entry(
    state: &AppState,
    date: String,
    body: String,
    font: Option<EntryFont>,
    now_ms: u64,
) -> Result<EntryView, CoreError> {
    let date = parse_date(date)?;
    let inner = inner(state);
    let key = inner.key.as_ref().ok_or(CoreError::Locked)?;
    Ok(inner
        .store
        .save_entry(key, &date, body, font, now_ms)?
        .into())
}

/// Saves `bytes`, a JPEG, PNG, or GIF, as a new image and returns its id.
pub fn save_image(state: &AppState, bytes: Vec<u8>) -> Result<String, CoreError> {
    let picture = Picture::try_from(bytes)?;
    let inner = inner(state);
    let key = inner.key.as_ref().ok_or(CoreError::Locked)?;
    Ok(inner.store.save_image(key, &picture)?.into())
}

/// The picture saved as `id`.
pub fn read_image(state: &AppState, id: String) -> Result<Vec<u8>, CoreError> {
    let id = ImageId::try_from(id).map_err(CoreError::InvalidImageId)?;
    let inner = inner(state);
    let key = inner.key.as_ref().ok_or(CoreError::Locked)?;
    Ok(inner.store.read_image(key, &id)?.into())
}

/// The vault's Secret Key as text, for the person to keep again. Only while
/// unlocked, from this device's keychain.
pub fn secret_key_text(state: &AppState) -> Result<String, CoreError> {
    let inner = inner(state);
    inner.key.as_ref().ok_or(CoreError::Locked)?;
    let secret_key = inner.store.secret_key()?.ok_or(CoreError::NoSecretKey)?;
    Ok(secret_key.to_text().to_string())
}

pub fn biometry_status(state: &AppState) -> Result<BiometryStatus, CoreError> {
    let store = inner(state).store.clone();
    let biometry = store.biometry();
    let on = biometry.is_some() && store.keeps_vault_key()?;
    Ok(BiometryStatus { biometry, on })
}

/// Keeps the open vault's key behind Touch ID or Face ID. Only while unlocked.
pub fn turn_on_biometry(state: &AppState) -> Result<(), CoreError> {
    let inner = inner(state);
    let key = inner.key.as_ref().ok_or(CoreError::Locked)?;
    inner.store.keep_vault_key(key)
}

pub fn turn_off_biometry(state: &AppState) -> Result<(), CoreError> {
    let store = inner(state).store.clone();
    store.forget_vault_key()
}

/// Every date that has an entry, oldest first, as `YYYY-MM-DD`.
pub fn entry_dates(state: &AppState) -> Result<Vec<String>, CoreError> {
    let inner = inner(state);
    inner.key.as_ref().ok_or(CoreError::Locked)?;
    Ok(inner
        .store
        .entry_dates()?
        .into_iter()
        .map(String::from)
        .collect())
}

/// The time now, as `save_entry` takes it.
pub fn now_ms() -> u64 {
    let since_epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("the clock is after 1970");
    u64::try_from(since_epoch.as_millis()).expect("milliseconds since 1970 fit in u64")
}

fn parse_date(date: String) -> Result<EntryDate, CoreError> {
    EntryDate::try_from(date).map_err(CoreError::InvalidDate)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state() -> (tempfile::TempDir, AppState) {
        let dir = tempfile::tempdir().unwrap();
        let store = LocalStore::new(
            dir.path().to_path_buf(),
            std::sync::Arc::new(crate::keychain::MemoryKeychain::default()),
        );
        (dir, AppState::new(AppStateInner::new(store)))
    }

    fn create_and_unlock(state: &AppState, passphrase: &str) {
        let pending = begin_unlock(state);
        let (key, _) = pending.store.create_vault(passphrase).unwrap();
        finish_unlock(state, pending, key).unwrap();
    }

    #[test]
    fn a_device_without_the_secret_key_says_it_needs_one() {
        let (dir, state) = state();
        create_and_unlock(&state, "correct horse");
        let device = LocalStore::new(
            dir.path().to_path_buf(),
            std::sync::Arc::new(crate::keychain::MemoryKeychain::default()),
        );
        let device = AppState::new(AppStateInner::new(device));
        assert_eq!(status(&device), VaultStatus::NeedsSecretKey);
    }

    #[test]
    fn an_unreadable_vault_or_keychain_shows_as_locked_so_unlocking_can_say_why() {
        let (dir, state) = state();
        create_and_unlock(&state, "correct horse");
        let device = LocalStore::new(
            dir.path().to_path_buf(),
            std::sync::Arc::new(crate::keychain::BrokenKeychain),
        );
        assert_eq!(
            status(&AppState::new(AppStateInner::new(device))),
            VaultStatus::Locked
        );

        let (old_dir, old_state) = super::tests::state();
        std::fs::write(
            old_dir.path().join("vault.json"),
            r#"{"version":1,"kdf":{},"verifier":{}}"#,
        )
        .unwrap();
        assert_eq!(status(&old_state), VaultStatus::Locked);
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
            Err(CoreError::Locked)
        ));
    }

    #[test]
    fn a_lock_during_an_unlock_wins() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        lock(&state);

        let pending = begin_unlock(&state);
        let key = pending.store.unlock("correct horse", None).unwrap();
        lock(&state); // the user locks while the key is being derived
        assert!(matches!(
            finish_unlock(&state, pending, key),
            Err(CoreError::Locked)
        ));
        assert_eq!(status(&state), VaultStatus::Locked);
    }

    #[test]
    fn saving_needs_an_unlocked_vault() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        lock(&state);
        assert!(matches!(
            save_entry(&state, "2026-10-29".to_string(), "b".to_string(), None, 1),
            Err(CoreError::Locked)
        ));
    }

    #[test]
    fn the_secret_key_shows_again_only_while_unlocked() {
        let (_dir, state) = state();
        let pending = begin_unlock(&state);
        let (key, created) = pending.store.create_vault("correct horse").unwrap();
        finish_unlock(&state, pending, key).unwrap();
        assert_eq!(secret_key_text(&state).unwrap(), *created.to_text());
        lock(&state);
        assert!(matches!(secret_key_text(&state), Err(CoreError::Locked)));
    }

    #[test]
    fn touch_id_turns_on_only_while_unlocked_and_shows_in_the_status() {
        let dir = tempfile::tempdir().unwrap();
        let store = LocalStore::new(
            dir.path().to_path_buf(),
            std::sync::Arc::new(crate::keychain::MemoryKeychain::default()),
        )
        .with_vault_keys(std::sync::Arc::new(
            crate::biometry::MemoryVaultKeys::default(),
        ));
        let state = AppState::new(AppStateInner::new(store));
        create_and_unlock(&state, "correct horse");
        let off = BiometryStatus {
            biometry: Some(Biometry::TouchId),
            on: false,
        };
        assert_eq!(biometry_status(&state).unwrap(), off);

        turn_on_biometry(&state).unwrap();
        assert!(biometry_status(&state).unwrap().on);
        turn_off_biometry(&state).unwrap();
        assert_eq!(biometry_status(&state).unwrap(), off);

        lock(&state);
        assert!(matches!(turn_on_biometry(&state), Err(CoreError::Locked)));
    }

    #[test]
    fn a_device_without_biometry_shows_it_as_unavailable() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        let status = biometry_status(&state).unwrap();
        assert_eq!(
            status,
            BiometryStatus {
                biometry: None,
                on: false
            }
        );
        assert!(matches!(
            turn_on_biometry(&state),
            Err(CoreError::NoBiometry)
        ));
    }

    #[test]
    fn listing_dates_needs_an_unlocked_vault() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        save_entry(&state, "2026-10-29".to_string(), "b".to_string(), None, 1).unwrap();
        assert_eq!(entry_dates(&state).unwrap(), ["2026-10-29"]);
        lock(&state);
        assert!(matches!(entry_dates(&state), Err(CoreError::Locked)));
    }

    #[test]
    fn a_saved_entry_reads_back_as_the_frontend_sees_it() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        let font = EntryFont {
            id: "klee-one".to_string(),
            family: "Klee One".to_string(),
            category: "handwriting".to_string(),
            stylesheet: "css/klee".to_string(),
        };
        save_entry(
            &state,
            "2026-10-29".to_string(),
            "晴れ".to_string(),
            Some(font.clone()),
            5,
        )
        .unwrap();
        assert_eq!(
            read_entry(&state, "2026-10-29".to_string()).unwrap(),
            Some(EntryView {
                date: "2026-10-29".to_string(),
                body: "晴れ".to_string(),
                created_at_ms: 5,
                updated_at_ms: 5,
                font: Some(font),
            })
        );
    }

    #[test]
    fn a_malformed_date_from_the_frontend_is_refused() {
        let (_dir, state) = state();
        create_and_unlock(&state, "correct horse");
        assert!(matches!(
            read_entry(&state, "../../vault".to_string()),
            Err(CoreError::InvalidDate(_))
        ));
    }

    #[test]
    fn the_frontend_sees_camel_case_names() {
        let view = EntryView {
            date: "2026-10-29".to_string(),
            body: String::new(),
            created_at_ms: 1,
            updated_at_ms: 2,
            font: None,
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
