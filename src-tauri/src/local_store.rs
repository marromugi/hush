use std::ffi::OsStr;
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
    /// existing vault, since that would make every entry unreadable. The
    /// file system decides who wins when two calls race, so only the key of
    /// the vault actually on disk is ever returned.
    pub fn create_vault(&self, passphrase: &str) -> Result<VaultKey, AppError> {
        if passphrase.is_empty() {
            return Err(AppError::EmptyPassphrase);
        }
        if self.has_vault() {
            return Err(AppError::VaultExists);
        }
        let (vault, key) = Vault::create(passphrase)?;
        match write_new(&self.vault_path(), vault.to_json().as_bytes()) {
            Ok(()) => Ok(key),
            Err(e) if e.kind() == io::ErrorKind::AlreadyExists => Err(AppError::VaultExists),
            Err(e) => Err(e.into()),
        }
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

    /// Every date that has an entry file, oldest first. A file counts only
    /// at the path `read_entry` reads for its date, so temporaries and
    /// stray files are not dates. The files are not opened.
    pub fn entry_dates(&self) -> Result<Vec<EntryDate>, AppError> {
        let years = match fs::read_dir(self.dir.join("entries")) {
            Ok(years) => years,
            Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
            Err(e) => return Err(e.into()),
        };
        let mut dates = Vec::new();
        for year in years {
            let year = year?;
            if !year.file_type()?.is_dir() {
                continue;
            }
            for file in fs::read_dir(year.path())? {
                dates.extend(entry_date_at(&year.file_name(), &file?.file_name()));
            }
        }
        dates.sort();
        Ok(dates)
    }
}

/// The date whose entry lives at `entries/{year}/{file}`, if any.
fn entry_date_at(year: &OsStr, file: &OsStr) -> Option<EntryDate> {
    let (year, file) = (year.to_str()?, file.to_str()?);
    let date = EntryDate::try_from(file.strip_suffix(".enc")?.to_string()).ok()?;
    (date.path() == format!("entries/{year}/{file}")).then_some(date)
}

/// Writes to a temporary file next to `path` and renames it into place, so a
/// crash mid-write leaves the previous file intact.
fn write_atomically(path: &Path, contents: &[u8]) -> io::Result<()> {
    let temporary = write_temporary(path, contents)?;
    fs::rename(&temporary, path).inspect_err(|_| {
        let _ = fs::remove_file(&temporary);
    })
}

/// Like `write_atomically`, but fails with `AlreadyExists` if `path` exists.
/// A hard link never replaces an existing name, so the check and the write
/// are one step.
fn write_new(path: &Path, contents: &[u8]) -> io::Result<()> {
    let temporary = write_temporary(path, contents)?;
    let linked = fs::hard_link(&temporary, path);
    let _ = fs::remove_file(&temporary);
    linked
}

/// A fully written and synced file next to `path`, under a random name so
/// concurrent writers never share it.
fn write_temporary(path: &Path, contents: &[u8]) -> io::Result<PathBuf> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let suffix = getrandom::u64().map_err(io::Error::other)?;
    let temporary = path.with_extension(format!("{suffix:016x}.tmp"));
    let written = File::create_new(&temporary).and_then(|mut file| {
        file.write_all(contents)?;
        file.sync_all()
    });
    match written {
        Ok(()) => Ok(temporary),
        Err(e) => {
            let _ = fs::remove_file(&temporary);
            Err(e)
        }
    }
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
        assert_eq!(
            files_in(dir.path()),
            ["entries/2026/2026-10-29.enc", "vault.json"]
        );
    }

    /// Every file under `dir`, relative and sorted, so leftovers show up.
    fn files_in(dir: &Path) -> Vec<String> {
        fn walk(root: &Path, dir: &Path, out: &mut Vec<String>) {
            for entry in fs::read_dir(dir).unwrap() {
                let path = entry.unwrap().path();
                if path.is_dir() {
                    walk(root, &path, out);
                } else {
                    let relative = path.strip_prefix(root).unwrap();
                    out.push(relative.to_string_lossy().into_owned());
                }
            }
        }
        let mut out = Vec::new();
        walk(dir, dir, &mut out);
        out.sort();
        out
    }

    #[test]
    fn two_vaults_created_at_once_never_disagree_with_the_disk() {
        for _ in 0..5 {
            let (dir, store) = store();
            let results: Vec<_> = std::thread::scope(|scope| {
                let a = scope.spawn(|| ("alpha", store.create_vault("alpha")));
                let b = scope.spawn(|| ("beta", store.create_vault("beta")));
                vec![a.join().unwrap(), b.join().unwrap()]
            });
            let winners: Vec<_> = results.iter().filter(|(_, r)| r.is_ok()).collect();
            assert_eq!(winners.len(), 1, "both or neither created a vault");
            let (winner, _) = winners[0];
            assert!(
                store.unlock(winner).is_ok(),
                "the returned key is not the vault on disk"
            );
            for (passphrase, result) in &results {
                if *passphrase != *winner {
                    assert!(matches!(result, Err(AppError::VaultExists)));
                }
            }
            assert_eq!(files_in(dir.path()), ["vault.json"]);
        }
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
    fn entry_dates_are_the_saved_days_oldest_first() {
        let (_dir, store) = store();
        let key = store.create_vault("correct horse").unwrap();
        assert!(store.entry_dates().unwrap().is_empty());
        for day in ["2026-10-29", "2025-12-31", "2026-01-02"] {
            store
                .save_entry(&key, &date(day), "diary".to_string(), 1_000)
                .unwrap();
        }
        assert_eq!(
            store.entry_dates().unwrap(),
            [date("2025-12-31"), date("2026-01-02"), date("2026-10-29")]
        );
    }

    #[test]
    fn files_that_read_entry_would_not_read_are_not_dates() {
        let (dir, store) = store();
        let entries = dir.path().join("entries");
        fs::create_dir_all(entries.join("2026")).unwrap();
        for stray in [
            "entries/2026/2026-10-29.0123456789abcdef.tmp",
            "entries/2026/2025-10-29.enc",
            "entries/2026/.DS_Store",
            "entries/2026/notes.enc",
            "entries/README.md",
        ] {
            fs::write(dir.path().join(stray), "x").unwrap();
        }
        fs::write(entries.join("2026/2026-10-30.enc"), "x").unwrap();
        assert_eq!(store.entry_dates().unwrap(), [date("2026-10-30")]);
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
