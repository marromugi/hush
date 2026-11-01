use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};

use crate::app_error::AppError;
use crate::crypto::VaultKey;
use crate::entry::{self, Entry, EntryDate};
use crate::vault::Vault;

/// The vault and entries on this device. The layout matches the GitHub
/// repository (`vault.json`, `entries/YYYY/YYYY-MM-DD.enc`) so the same
/// files can be pushed as they are.
#[derive(Debug, Clone)]
pub struct LocalStore {
    dir: PathBuf,
}

impl LocalStore {
    pub fn new(dir: PathBuf) -> Self {
        LocalStore { dir }
    }

    fn vault_path(&self) -> PathBuf {
        self.dir.join("vault.json")
    }

    fn entry_path(&self, date: &EntryDate) -> PathBuf {
        self.dir.join(date.path())
    }

    pub fn has_vault(&self) -> bool {
        self.vault_path().exists()
    }

    /// Makes a new vault and writes `vault.json`. Refuses to replace an
    /// existing vault, since that would make every entry unreadable.
    pub fn create_vault(&self, passphrase: &str) -> Result<VaultKey, AppError> {
        if passphrase.is_empty() {
            return Err(AppError::EmptyPassphrase);
        }
        if self.has_vault() {
            return Err(AppError::VaultExists);
        }
        let (vault, key) = Vault::create(passphrase)?;
        write_atomically(&self.vault_path(), vault.to_json().as_bytes())?;
        Ok(key)
    }

    pub fn unlock(&self, passphrase: &str) -> Result<VaultKey, AppError> {
        let text = match fs::read_to_string(self.vault_path()) {
            Ok(text) => text,
            Err(e) if e.kind() == io::ErrorKind::NotFound => return Err(AppError::NoVault),
            Err(e) => return Err(e.into()),
        };
        Vault::parse(&text)?.unlock(passphrase)
    }

    /// The entry for `date`, or `None` if nothing has been written that day.
    pub fn read_entry(&self, key: &VaultKey, date: &EntryDate) -> Result<Option<Entry>, AppError> {
        let text = match fs::read_to_string(self.entry_path(date)) {
            Ok(text) => text,
            Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(e.into()),
        };
        entry::open(key, date, &text).map(Some)
    }

    /// Writes `body` as the entry for `date`. The existing entry is opened
    /// first: it keeps its creation time, and a file this app cannot open
    /// (newer version, broken) is never overwritten.
    pub fn save_entry(
        &self,
        key: &VaultKey,
        date: &EntryDate,
        body: String,
        now_ms: u64,
    ) -> Result<Entry, AppError> {
        let created_at_ms = self
            .read_entry(key, date)?
            .map_or(now_ms, |existing| existing.created_at_ms);
        let entry = Entry {
            date: date.clone(),
            body,
            created_at_ms,
            updated_at_ms: now_ms,
        };
        write_atomically(&self.entry_path(date), entry::seal(key, &entry)?.as_bytes())?;
        Ok(entry)
    }
}

/// Writes to a temporary file next to `path` and renames it into place, so a
/// crash mid-write leaves the previous file intact.
fn write_atomically(path: &Path, contents: &[u8]) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temporary = path.with_extension("tmp");
    let mut file = File::create(&temporary)?;
    file.write_all(contents)?;
    file.sync_all()?;
    fs::rename(&temporary, path)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(text: &str) -> EntryDate {
        EntryDate::try_from(text.to_string()).unwrap()
    }

    fn store() -> (tempfile::TempDir, LocalStore) {
        let dir = tempfile::tempdir().unwrap();
        let store = LocalStore::new(dir.path().to_path_buf());
        (dir, store)
    }

    #[test]
    fn a_saved_entry_reads_back_after_unlocking_again() {
        let (_dir, store) = store();
        let key = store.create_vault("correct horse").unwrap();
        store
            .save_entry(&key, &date("2026-10-29"), "今日は晴れ".to_string(), 1_000)
            .unwrap();
        drop(key);

        let key = store.unlock("correct horse").unwrap();
        let entry = store
            .read_entry(&key, &date("2026-10-29"))
            .unwrap()
            .unwrap();
        assert_eq!(entry.body, "今日は晴れ");
    }

    #[test]
    fn files_use_the_repository_layout() {
        let (dir, store) = store();
        let key = store.create_vault("correct horse").unwrap();
        store
            .save_entry(&key, &date("2026-10-29"), "diary".to_string(), 1_000)
            .unwrap();
        assert!(dir.path().join("vault.json").is_file());
        assert!(dir.path().join("entries/2026/2026-10-29.enc").is_file());
        assert!(!dir.path().join("entries/2026/2026-10-29.tmp").exists());
    }

    #[test]
    fn saving_again_keeps_the_creation_time() {
        let (_dir, store) = store();
        let key = store.create_vault("correct horse").unwrap();
        store
            .save_entry(&key, &date("2026-10-29"), "a".to_string(), 1_000)
            .unwrap();
        let entry = store
            .save_entry(&key, &date("2026-10-29"), "b".to_string(), 2_000)
            .unwrap();
        assert_eq!((entry.created_at_ms, entry.updated_at_ms), (1_000, 2_000));
    }

    #[test]
    fn a_day_with_nothing_written_is_none() {
        let (_dir, store) = store();
        let key = store.create_vault("correct horse").unwrap();
        assert!(
            store
                .read_entry(&key, &date("2026-10-29"))
                .unwrap()
                .is_none()
        );
    }

    #[test]
    fn an_existing_vault_is_never_replaced() {
        let (_dir, store) = store();
        store.create_vault("correct horse").unwrap();
        assert!(matches!(
            store.create_vault("another"),
            Err(AppError::VaultExists)
        ));
        assert!(store.unlock("correct horse").is_ok());
    }

    #[test]
    fn an_empty_passphrase_is_refused() {
        let (_dir, store) = store();
        assert!(matches!(
            store.create_vault(""),
            Err(AppError::EmptyPassphrase)
        ));
        assert!(!store.has_vault());
    }

    #[test]
    fn unlocking_without_a_vault_says_so() {
        let (_dir, store) = store();
        assert!(matches!(
            store.unlock("correct horse"),
            Err(AppError::NoVault)
        ));
    }

    #[test]
    fn an_entry_from_a_newer_app_is_not_overwritten() {
        let (dir, store) = store();
        let key = store.create_vault("correct horse").unwrap();
        let path = dir.path().join("entries/2026/2026-10-29.enc");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let newer = r#"{"version":2,"nonce":"x","ciphertext":"y","mood":"sunny"}"#;
        fs::write(&path, newer).unwrap();

        let result = store.save_entry(&key, &date("2026-10-29"), "b".to_string(), 2_000);
        assert!(matches!(result, Err(AppError::NewerEntryVersion(2))));
        assert_eq!(fs::read_to_string(&path).unwrap(), newer);
    }
}
