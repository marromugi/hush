use serde::{Deserialize, Serialize, de};

use crate::app_error::AppError;
use crate::b64;
use crate::crypto::{self, DEFAULT_KDF, KdfParams, SALT_LEN, Sealed, VaultKey};
use crate::file_version::read_version;

/// Current `vault.json` format. Bump when a field is added or changed.
pub const VAULT_VERSION: u32 = 1;

/// Encrypted into `verifier`; decrypting it proves the passphrase is right
/// without opening any entry.
const VERIFIER_TEXT: &[u8] = b"hush-vault-v1";
const VERIFIER_AAD: &[u8] = b"vault.json";

/// Upper bounds for KDF settings read from a file. A broken or altered file
/// asking for more is refused instead of exhausting memory at unlock.
const MAX_MEMORY_KIB: u32 = 256 * 1024;
const MAX_ITERATIONS: u32 = 16;
const MAX_PARALLELISM: u32 = 8;

/// The contents of `vault.json`. Not secret: it holds the salt, the KDF
/// settings, and an encrypted known text used to check the passphrase.
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Vault {
    version: u32,
    kdf: StoredKdf,
    verifier: Sealed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum KdfAlgorithm {
    Argon2id,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "RawKdf")]
struct StoredKdf {
    algorithm: KdfAlgorithm,
    memory_kib: u32,
    iterations: u32,
    parallelism: u32,
    #[serde(with = "b64::array")]
    salt: [u8; SALT_LEN],
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RawKdf {
    algorithm: KdfAlgorithm,
    memory_kib: u32,
    iterations: u32,
    parallelism: u32,
    #[serde(with = "b64::array")]
    salt: [u8; SALT_LEN],
}

impl TryFrom<RawKdf> for StoredKdf {
    type Error = String;

    fn try_from(raw: RawKdf) -> Result<Self, Self::Error> {
        if raw.memory_kib > MAX_MEMORY_KIB {
            return Err(format!(
                "memory_kib {} is over {MAX_MEMORY_KIB}",
                raw.memory_kib
            ));
        }
        if raw.iterations > MAX_ITERATIONS {
            return Err(format!(
                "iterations {} is over {MAX_ITERATIONS}",
                raw.iterations
            ));
        }
        if raw.parallelism > MAX_PARALLELISM {
            return Err(format!(
                "parallelism {} is over {MAX_PARALLELISM}",
                raw.parallelism
            ));
        }
        let kdf = StoredKdf {
            algorithm: raw.algorithm,
            memory_kib: raw.memory_kib,
            iterations: raw.iterations,
            parallelism: raw.parallelism,
            salt: raw.salt,
        };
        // Argon2's own lower limits, so a broken file is reported as broken
        // here rather than as a failed key derivation after the passphrase.
        crypto::check_kdf(&kdf.params()).map_err(|e| format!("kdf: {e}"))?;
        Ok(kdf)
    }
}

impl StoredKdf {
    fn params(&self) -> KdfParams {
        KdfParams {
            memory_kib: self.memory_kib,
            iterations: self.iterations,
            parallelism: self.parallelism,
        }
    }
}

impl Vault {
    /// Makes a new vault for `passphrase` and returns it with its key.
    pub fn create(passphrase: &str) -> Result<(Vault, VaultKey), AppError> {
        let kdf = StoredKdf {
            algorithm: KdfAlgorithm::Argon2id,
            memory_kib: DEFAULT_KDF.memory_kib,
            iterations: DEFAULT_KDF.iterations,
            parallelism: DEFAULT_KDF.parallelism,
            salt: crypto::new_salt()?,
        };
        let key = crypto::derive_key(passphrase, &kdf.salt, &kdf.params())?;
        let verifier = crypto::encrypt(&key, VERIFIER_AAD, VERIFIER_TEXT)?;
        let vault = Vault {
            version: VAULT_VERSION,
            kdf,
            verifier,
        };
        Ok((vault, key))
    }

    /// Parses `vault.json`. The version is read first, so a vault written by
    /// a newer app asks for an update instead of being reported as broken.
    pub fn parse(text: &str) -> Result<Vault, AppError> {
        let version = read_version(text).map_err(AppError::BrokenVault)?;
        if version > VAULT_VERSION {
            return Err(AppError::NewerVaultVersion(version));
        }
        if version < VAULT_VERSION {
            return Err(AppError::BrokenVault(de::Error::custom(format!(
                "unknown version {version}"
            ))));
        }
        serde_json::from_str(text).map_err(AppError::BrokenVault)
    }

    /// Derives the key from `passphrase` and checks it against the verifier.
    /// The cipher authenticates the verifier, so decrypting it at all proves
    /// the key.
    pub fn unlock(&self, passphrase: &str) -> Result<VaultKey, AppError> {
        let key = crypto::derive_key(passphrase, &self.kdf.salt, &self.kdf.params())?;
        match crypto::decrypt(&key, VERIFIER_AAD, &self.verifier) {
            Ok(_) => Ok(key),
            Err(AppError::Decryption) => Err(AppError::WrongPassphrase),
            Err(other) => Err(other),
        }
    }

    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).expect("vault fields are plain strings and numbers")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_new_vault_unlocks_with_its_passphrase_after_a_round_trip() {
        let (vault, _) = Vault::create("correct horse").unwrap();
        let reread = Vault::parse(&vault.to_json()).unwrap();
        assert_eq!(reread, vault);
        assert!(reread.unlock("correct horse").is_ok());
    }

    #[test]
    fn wrong_passphrase_is_reported_as_such() {
        let (vault, _) = Vault::create("correct horse").unwrap();
        assert!(matches!(
            vault.unlock("wrong horse"),
            Err(AppError::WrongPassphrase)
        ));
    }

    #[test]
    fn unlock_gives_the_same_key_as_create() {
        let (vault, created) = Vault::create("correct horse").unwrap();
        let sealed = crypto::encrypt(&created, b"entries/x.enc", b"diary").unwrap();
        let unlocked = vault.unlock("correct horse").unwrap();
        assert_eq!(
            crypto::decrypt(&unlocked, b"entries/x.enc", &sealed).unwrap(),
            b"diary"
        );
    }

    #[test]
    fn each_vault_gets_its_own_salt() {
        let (a, _) = Vault::create("correct horse").unwrap();
        let (b, _) = Vault::create("correct horse").unwrap();
        assert_ne!(a.kdf.salt, b.kdf.salt);
    }

    fn json_with(change: impl FnOnce(&mut serde_json::Value)) -> String {
        let (vault, _) = Vault::create("correct horse").unwrap();
        let mut value: serde_json::Value = serde_json::from_str(&vault.to_json()).unwrap();
        change(&mut value);
        value.to_string()
    }

    #[test]
    fn newer_version_with_new_fields_asks_for_an_update() {
        let text = json_with(|v| {
            v["version"] = 2.into();
            v["mood"] = "sunny".into();
        });
        assert!(matches!(
            Vault::parse(&text),
            Err(AppError::NewerVaultVersion(2))
        ));
    }

    #[test]
    fn unknown_field_at_the_current_version_is_broken() {
        let text = json_with(|v| v["mood"] = "sunny".into());
        assert!(matches!(Vault::parse(&text), Err(AppError::BrokenVault(_))));
    }

    #[test]
    fn version_zero_is_broken() {
        let text = json_with(|v| v["version"] = 0.into());
        assert!(matches!(Vault::parse(&text), Err(AppError::BrokenVault(_))));
    }

    #[test]
    fn kdf_settings_over_the_limits_are_refused() {
        for (field, value) in [
            ("memory_kib", MAX_MEMORY_KIB + 1),
            ("iterations", MAX_ITERATIONS + 1),
            ("parallelism", MAX_PARALLELISM + 1),
        ] {
            let text = json_with(|v| v["kdf"][field] = value.into());
            assert!(
                matches!(Vault::parse(&text), Err(AppError::BrokenVault(_))),
                "{field} = {value} was accepted"
            );
        }
    }

    #[test]
    fn kdf_settings_at_the_limits_are_accepted() {
        let text = json_with(|v| {
            v["kdf"]["memory_kib"] = MAX_MEMORY_KIB.into();
            v["kdf"]["iterations"] = MAX_ITERATIONS.into();
            v["kdf"]["parallelism"] = MAX_PARALLELISM.into();
        });
        assert!(Vault::parse(&text).is_ok());
    }

    #[test]
    fn a_salt_of_the_wrong_length_is_broken() {
        let text = json_with(|v| v["kdf"]["salt"] = "AAAA".into());
        assert!(matches!(Vault::parse(&text), Err(AppError::BrokenVault(_))));
    }

    #[test]
    fn another_algorithm_is_broken() {
        let text = json_with(|v| v["kdf"]["algorithm"] = "scrypt".into());
        assert!(matches!(Vault::parse(&text), Err(AppError::BrokenVault(_))));
    }

    #[test]
    fn kdf_settings_below_argon2s_limits_are_broken() {
        for (field, value) in [("memory_kib", 0), ("iterations", 0), ("parallelism", 0)] {
            let text = json_with(|v| v["kdf"][field] = value.into());
            assert!(
                matches!(Vault::parse(&text), Err(AppError::BrokenVault(_))),
                "{field} = {value} was accepted"
            );
        }
        let text = json_with(|v| {
            v["kdf"]["memory_kib"] = 8.into();
            v["kdf"]["parallelism"] = 8.into();
        });
        assert!(matches!(Vault::parse(&text), Err(AppError::BrokenVault(_))));
    }

    #[test]
    fn unknown_fields_nested_in_kdf_or_verifier_are_broken() {
        for section in ["kdf", "verifier"] {
            let text = json_with(|v| v[section]["extra"] = 1.into());
            assert!(
                matches!(Vault::parse(&text), Err(AppError::BrokenVault(_))),
                "extra field in {section} was accepted"
            );
        }
    }

    /// A vault.json as this format writes it. The Mac and iPhone apps both
    /// read these files, so field names and the Base64 form must not drift.
    const FIXTURE: &str = r#"{
  "version": 1,
  "kdf": {
    "algorithm": "argon2id",
    "memory_kib": 8,
    "iterations": 1,
    "parallelism": 1,
    "salt": "CQkJCQkJCQkJCQkJCQkJCQ=="
  },
  "verifier": {
    "nonce": "vesARyJiSvEzaAR3w7JmzlkoZz25kaQ/",
    "ciphertext": "gd3NST4zTbwTNLiiy3Fh7XAX6ZVOgfoSYlITFKw="
  }
}"#;

    #[test]
    fn the_fixed_vault_json_reads_unlocks_and_writes_back_unchanged() {
        let vault = Vault::parse(FIXTURE).unwrap();
        assert!(vault.unlock("correct horse").is_ok());
        assert_eq!(vault.to_json(), FIXTURE);
    }
}
