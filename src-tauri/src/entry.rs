use serde::{Deserialize, Serialize, de};

use crate::app_error::AppError;
use crate::b64;
use crate::crypto::{self, NONCE_LEN, Sealed, VaultKey};
use crate::file_version::read_version;

/// Current entry file format. Bump when a field is added or changed, in the
/// file or in the encrypted `Entry` inside it, and when the body starts
/// holding something an older app would drop on saving. From 3 the body may
/// hold images (`<img data-image="…">`), from 4 their widths
/// (`data-width="…"`), from 5 their alignment (`data-align="…"`), and from 6
/// embeds of YouTube and X (`<div data-embed="…" data-id="…">`).
pub const ENTRY_VERSION: u32 = 6;

/// One day's entry, as it is before encryption and after decryption.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Entry {
    pub date: EntryDate,
    pub body: String,
    pub created_at_ms: u64,
    pub updated_at_ms: u64,
    /// `None` shows the entry in the reader's default font.
    pub font: Option<EntryFont>,
}

/// The font an entry is shown in, with the stylesheet that loads it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EntryFont {
    pub id: String,
    pub family: String,
    pub category: String,
    pub stylesheet: String,
}

/// An entry as version 1 wrote it, before entries had a font.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct EntryV1 {
    date: EntryDate,
    body: String,
    created_at_ms: u64,
    updated_at_ms: u64,
}

impl From<EntryV1> for Entry {
    fn from(old: EntryV1) -> Self {
        Entry {
            date: old.date,
            body: old.body,
            created_at_ms: old.created_at_ms,
            updated_at_ms: old.updated_at_ms,
            font: None,
        }
    }
}

/// A `YYYY-MM-DD` date. It names the entry's file, so only a well-formed
/// date can be built. Ordered oldest first, since the text sorts that way.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
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
/// update instead of being reported as broken. A version 1 file opens with
/// no font.
pub fn open(key: &VaultKey, date: &EntryDate, text: &str) -> Result<Entry, AppError> {
    let version = read_version(text).map_err(AppError::BrokenEntry)?;
    if version > ENTRY_VERSION {
        return Err(AppError::NewerEntryVersion(version));
    }
    if version == 0 {
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
    // serde's message can quote the decrypted text, and errors reach the
    // frontend, so only that the format is wrong is reported.
    let entry = if version == 1 {
        serde_json::from_slice::<EntryV1>(&plaintext).map(Entry::from)
    } else {
        serde_json::from_slice::<Entry>(&plaintext)
    };
    let entry = entry.map_err(|_| {
        AppError::BrokenEntry(de::Error::custom(
            "decrypted entry is not in the entry format",
        ))
    })?;
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
    use crate::secret_key::{SECRET_KEY_LEN, SecretKey};

    /// Cheap settings so the tests stay fast; the code path is the same.
    const TEST_KDF: KdfParams = KdfParams {
        memory_kib: 8,
        iterations: 1,
        parallelism: 1,
    };

    fn key(passphrase: &str) -> VaultKey {
        let secret_key = SecretKey::from_bytes(&[9; SECRET_KEY_LEN]).unwrap();
        derive_key(passphrase, &secret_key, &[7; SALT_LEN], &TEST_KDF).unwrap()
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
            font: None,
        }
    }

    fn klee() -> EntryFont {
        EntryFont {
            id: "klee-one".to_string(),
            family: "Klee One".to_string(),
            category: "handwriting".to_string(),
            stylesheet: "https://cdn.jsdelivr.net/npm/@fontsource/klee-one@5.2.5/index.css"
                .to_string(),
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
    fn opens_the_font_it_sealed() {
        let key = key("correct horse");
        let entry = Entry {
            font: Some(klee()),
            ..entry("2026-10-29")
        };
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
            v["version"] = 7.into();
            v["mood"] = "sunny".into();
        });
        assert!(matches!(
            open(&key("correct horse"), &date("2026-10-29"), &text),
            Err(AppError::NewerEntryVersion(7))
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
        file_of_version(ENTRY_VERSION, key, day, inner)
    }

    fn file_of_version(
        version: u32,
        key: &VaultKey,
        day: &str,
        inner: serde_json::Value,
    ) -> String {
        let Sealed { nonce, ciphertext } = crypto::encrypt(
            key,
            date(day).path().as_bytes(),
            inner.to_string().as_bytes(),
        )
        .unwrap();
        serde_json::to_string(&EntryFile {
            version,
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
    fn the_error_for_a_broken_entry_never_quotes_its_text() {
        let key = key("correct horse");
        let mut inner = inner_entry();
        inner["created_at_ms"] = "secret words".into();
        let text = file_containing(&key, "2026-10-29", inner);
        let error = open(&key, &date("2026-10-29"), &text).unwrap_err();
        let message = serde_json::to_value(&error).unwrap()["message"].to_string();
        assert!(!message.contains("secret words"), "{message}");
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

    #[test]
    fn a_version_1_entry_with_a_font_is_broken() {
        let key = key("correct horse");
        let mut inner = inner_entry();
        inner["font"] = serde_json::to_value(klee()).unwrap();
        let text = file_of_version(1, &key, "2026-10-29", inner);
        assert!(matches!(
            open(&key, &date("2026-10-29"), &text),
            Err(AppError::BrokenEntry(_))
        ));
    }

    #[test]
    fn an_unknown_field_inside_the_font_is_broken() {
        let key = key("correct horse");
        let mut inner = inner_entry();
        inner["font"] = serde_json::to_value(klee()).unwrap();
        inner["font"]["weight"] = 400.into();
        let text = file_containing(&key, "2026-10-29", inner);
        assert!(matches!(
            open(&key, &date("2026-10-29"), &text),
            Err(AppError::BrokenEntry(_))
        ));
    }

    /// A version 1 entry file, sealed with `key("correct horse")` for
    /// `entry("2026-10-29")` before entries had a font. Files like it stay
    /// on disk and must keep opening.
    const FIXTURE: &str = r#"{
  "version": 1,
  "nonce": "COxZRyFpl6erxrTaUJTEGAFMEoviBE7g",
  "ciphertext": "Ir6Tcrkp1P3LGP/mw9oKv+O6VnaDoaltNNc5UbWD2eIL9SBCo9AcUTCBmo49Ei6HjNdw0EiQxewm5sXXnV2qYS7UWhVlKYvQM5SvwdUCdcfnTsvs/WkD3keJ2tdd3UCa6unv+XhyKe/t1zLHkkDQjG6tyw5iY4BPqqc="
}"#;

    #[test]
    fn the_fixed_version_1_file_opens_with_no_font() {
        assert_eq!(
            open(&key("correct horse"), &date("2026-10-29"), FIXTURE).unwrap(),
            entry("2026-10-29")
        );
    }

    /// An entry file as this format writes it, sealed with `key("correct horse")`
    /// for `entry("2026-10-29")` in Klee One. The Mac and iPhone apps both
    /// read these files, so field names and the Base64 form must not drift.
    const FIXTURE_V2: &str = r#"{
  "version": 2,
  "nonce": "HdqFdfAliVEsUA3yN3nHKerho07+/GLh",
  "ciphertext": "WI93kuDAdOzkbvCxpyRxaMDHyqUvJ/r7HNb5xBlxvBJcGMr6dLHK1oUXKoGm/wGmcBUxHZo9GExzJOlpYBCSUWtijCsxx1vcoCwxEMDsxx8aHqZdpqj0uMwp8140NhDndYdGV4+fgNtsoMWrjuTkv8eIRac1JAVCB0uB6C+F2bruRWDDQm+h0P7QM5lHM4uZTa88ClmLr5fQKIOPROl7C7A4puSQFm9wsxzTHSrVmJ3kWFUw55qk4i7nvdtbN1nWEese50n244HaPJEujhurb9KI6/HS0K4rMgnjOglAXfESlpctGzd/tjjWV9wVSzc/GnBaQiKsRCqMLO17NgWqJi1zWDF0MiCTO43pRHLefVN3"
}"#;

    #[test]
    fn the_fixed_version_2_file_opens_to_the_known_entry() {
        assert_eq!(
            open(&key("correct horse"), &date("2026-10-29"), FIXTURE_V2).unwrap(),
            Entry {
                font: Some(klee()),
                ..entry("2026-10-29")
            }
        );
    }
}
