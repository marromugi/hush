use serde::{Deserialize, Serialize, de};

use crate::app_error::AppError;
use crate::b64;
use crate::crypto::{self, NONCE_LEN, Sealed, VaultKey};
use crate::file_version::read_version;

/// Current entry file format. Bump when a field is added or changed, in the
/// file or in the encrypted `Entry` inside it.
pub const ENTRY_VERSION: u32 = 1;

/// One day's entry, as it is before encryption and after decryption.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Entry {
    pub date: EntryDate,
    pub body: String,
    pub created_at_ms: u64,
    pub updated_at_ms: u64,
}

/// A `YYYY-MM-DD` date. It names the entry's file, so only a well-formed
/// date can be built.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub struct EntryDate(String);

impl TryFrom<String> for EntryDate {
    type Error = String;

    fn try_from(text: String) -> Result<Self, Self::Error> {
        let bytes = text.as_bytes();
        let shaped = bytes.len() == 10
            && bytes[4] == b'-'
            && bytes[7] == b'-'
            && [0, 1, 2, 3, 5, 6, 8, 9]
                .iter()
                .all(|&i| bytes[i].is_ascii_digit());
        if !shaped {
            return Err(format!("{text:?} is not YYYY-MM-DD"));
        }
        let month: u32 = text[5..7].parse().expect("checked to be digits");
        let day: u32 = text[8..10].parse().expect("checked to be digits");
        if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
            return Err(format!("{text:?} is not a date"));
        }
        Ok(EntryDate(text))
    }
}

impl From<EntryDate> for String {
    fn from(date: EntryDate) -> String {
        date.0
    }
}

impl EntryDate {
    /// Where the entry lives in the repository, e.g. `entries/2026/2026-10-29.enc`.
    /// Also the associated data of its encryption, so a file moved to another
    /// date fails to decrypt.
    pub fn path(&self) -> String {
        format!("entries/{}/{}.enc", &self.0[..4], self.0)
    }
}

/// The contents of an entry file: the version and the encrypted `Entry`.
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct EntryFile {
    version: u32,
    #[serde(with = "b64::array")]
    nonce: [u8; NONCE_LEN],
    #[serde(with = "b64::vec")]
    ciphertext: Vec<u8>,
}

/// Encrypts `entry` and returns the text of its entry file.
pub fn seal(key: &VaultKey, entry: &Entry) -> Result<String, AppError> {
    let plaintext = serde_json::to_vec(entry).expect("entry fields are plain strings and numbers");
    let Sealed { nonce, ciphertext } =
        crypto::encrypt(key, entry.date.path().as_bytes(), &plaintext)?;
    let file = EntryFile {
        version: ENTRY_VERSION,
        nonce,
        ciphertext,
    };
    Ok(serde_json::to_string_pretty(&file)
        .expect("entry file fields are plain strings and numbers"))
}

/// Decrypts the entry file `text` that was read from `date`'s path. The
/// version is read first, so a file written by a newer app asks for an
/// update instead of being reported as broken.
pub fn open(key: &VaultKey, date: &EntryDate, text: &str) -> Result<Entry, AppError> {
    let version = read_version(text).map_err(AppError::BrokenEntry)?;
    if version > ENTRY_VERSION {
        return Err(AppError::NewerEntryVersion(version));
    }
    if version < ENTRY_VERSION {
        return Err(AppError::BrokenEntry(de::Error::custom(format!(
            "unknown version {version}"
        ))));
    }
    let file: EntryFile = serde_json::from_str(text).map_err(AppError::BrokenEntry)?;
    let plaintext = crypto::decrypt(
        key,
        date.path().as_bytes(),
        &Sealed {
            nonce: file.nonce,
            ciphertext: file.ciphertext,
        },
    )?;
    let entry: Entry = serde_json::from_slice(&plaintext).map_err(AppError::BrokenEntry)?;
    if entry.date != *date {
        return Err(AppError::BrokenEntry(de::Error::custom(format!(
            "entry for {} found at {}",
            entry.date.0,
            date.path()
        ))));
    }
    Ok(entry)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::{KdfParams, SALT_LEN, derive_key};

    /// Cheap settings so the tests stay fast; the code path is the same.
    const TEST_KDF: KdfParams = KdfParams {
        memory_kib: 8,
        iterations: 1,
        parallelism: 1,
    };

    fn key(passphrase: &str) -> VaultKey {
        derive_key(passphrase, &[7; SALT_LEN], &TEST_KDF).unwrap()
    }

    fn date(text: &str) -> EntryDate {
        EntryDate::try_from(text.to_string()).unwrap()
    }

    fn entry(day: &str) -> Entry {
        Entry {
            date: date(day),
            body: "今日は晴れ".to_string(),
            created_at_ms: 1_793_000_000_000,
            updated_at_ms: 1_793_000_100_000,
        }
    }

    #[test]
    fn opens_what_it_sealed() {
        let key = key("correct horse");
        let entry = entry("2026-10-29");
        let text = seal(&key, &entry).unwrap();
        assert_eq!(open(&key, &entry.date, &text).unwrap(), entry);
    }

    #[test]
    fn the_file_does_not_contain_the_body() {
        let text = seal(&key("correct horse"), &entry("2026-10-29")).unwrap();
        assert!(!text.contains("今日は晴れ"));
        assert!(!text.contains("2026-10-29"));
    }

    #[test]
    fn a_file_read_from_another_date_fails() {
        let key = key("correct horse");
        let text = seal(&key, &entry("2026-10-29")).unwrap();
        assert!(matches!(
            open(&key, &date("2026-10-30"), &text),
            Err(AppError::Decryption)
        ));
    }

    #[test]
    fn path_is_by_year() {
        assert_eq!(date("2026-10-29").path(), "entries/2026/2026-10-29.enc");
    }

    #[test]
    fn malformed_dates_are_refused() {
        for text in [
            "2026-1-29",
            "2026/10/29",
            "2026-13-01",
            "2026-10-32",
            "2026-00-10",
            "abcd-ef-gh",
            "",
        ] {
            assert!(
                EntryDate::try_from(text.to_string()).is_err(),
                "{text:?} was accepted"
            );
            assert!(
                serde_json::from_value::<EntryDate>(text.into()).is_err(),
                "{text:?} was read from JSON"
            );
        }
    }

    fn file_with(change: impl FnOnce(&mut serde_json::Value)) -> String {
        let text = seal(&key("correct horse"), &entry("2026-10-29")).unwrap();
        let mut value: serde_json::Value = serde_json::from_str(&text).unwrap();
        change(&mut value);
        value.to_string()
    }

    #[test]
    fn newer_version_with_new_fields_asks_for_an_update() {
        let text = file_with(|v| {
            v["version"] = 2.into();
            v["mood"] = "sunny".into();
        });
        assert!(matches!(
            open(&key("correct horse"), &date("2026-10-29"), &text),
            Err(AppError::NewerEntryVersion(2))
        ));
    }

    #[test]
    fn unknown_field_at_the_current_version_is_broken() {
        let text = file_with(|v| v["mood"] = "sunny".into());
        assert!(matches!(
            open(&key("correct horse"), &date("2026-10-29"), &text),
            Err(AppError::BrokenEntry(_))
        ));
    }

    #[test]
    fn a_nonce_of_the_wrong_length_is_broken() {
        let text = file_with(|v| v["nonce"] = "AAAA".into());
        assert!(matches!(
            open(&key("correct horse"), &date("2026-10-29"), &text),
            Err(AppError::BrokenEntry(_))
        ));
    }

    #[test]
    fn version_zero_is_broken() {
        let text = file_with(|v| v["version"] = 0.into());
        assert!(matches!(
            open(&key("correct horse"), &date("2026-10-29"), &text),
            Err(AppError::BrokenEntry(_))
        ));
    }

    /// Seals arbitrary JSON as if it were an `Entry`, the way a faulty writer
    /// in the other app might, and returns the entry file for `day`.
    fn file_containing(key: &VaultKey, day: &str, inner: serde_json::Value) -> String {
        let Sealed { nonce, ciphertext } = crypto::encrypt(
            key,
            date(day).path().as_bytes(),
            inner.to_string().as_bytes(),
        )
        .unwrap();
        serde_json::to_string(&EntryFile {
            version: ENTRY_VERSION,
            nonce,
            ciphertext,
        })
        .unwrap()
    }

    fn inner_entry() -> serde_json::Value {
        serde_json::to_value(entry("2026-10-29")).unwrap()
    }

    #[test]
    fn a_malformed_date_inside_the_entry_is_broken() {
        let key = key("correct horse");
        let mut inner = inner_entry();
        inner["date"] = "2026-13-01".into();
        let text = file_containing(&key, "2026-10-29", inner);
        assert!(matches!(
            open(&key, &date("2026-10-29"), &text),
            Err(AppError::BrokenEntry(_))
        ));
    }

    #[test]
    fn an_unknown_field_inside_the_entry_is_broken() {
        let key = key("correct horse");
        let mut inner = inner_entry();
        inner["mood"] = "sunny".into();
        let text = file_containing(&key, "2026-10-29", inner);
        assert!(matches!(
            open(&key, &date("2026-10-29"), &text),
            Err(AppError::BrokenEntry(_))
        ));
    }

    #[test]
    fn an_entry_for_another_day_at_this_path_is_broken() {
        let key = key("correct horse");
        let mut inner = inner_entry();
        inner["date"] = "2026-10-30".into();
        let text = file_containing(&key, "2026-10-29", inner);
        assert!(matches!(
            open(&key, &date("2026-10-29"), &text),
            Err(AppError::BrokenEntry(_))
        ));
    }

    /// An entry file as this format writes it, sealed with `key("correct horse")`
    /// for `entry("2026-10-29")`. The Mac and iPhone apps both read these
    /// files, so field names and the Base64 form must not drift.
    const FIXTURE: &str = r#"{
  "version": 1,
  "nonce": "Bj/f4qt/p+mTREWG+2chiSgOGeNeA3jo",
  "ciphertext": "NIRjQNvdOBoQum8t57ESe7oE5Tbyq/pWa+M/ognKr3gZoOWkvdifhq9ufD9gpiwoZH9x2ckmMMieVhYpq4ZEPQki0a7RL0C/TBEHTOAyM9CreDz9zmhJiwhUteO4YbnpR3YxffujNfKsI1mHuUx6XjhipHYtgj9ix7M="
}"#;

    #[test]
    fn the_fixed_entry_file_opens_to_the_known_entry() {
        assert_eq!(
            open(&key("correct horse"), &date("2026-10-29"), FIXTURE).unwrap(),
            entry("2026-10-29")
        );
    }
}
