use std::fmt;

use argon2::{Algorithm, Argon2, Block, Params, Version};
use chacha20poly1305::XChaCha20Poly1305;
use chacha20poly1305::XNonce;
use chacha20poly1305::aead::{Aead, Generate, KeyInit, Payload};
use serde::{Deserialize, Serialize};
use zeroize::{ZeroizeOnDrop, Zeroizing};

use crate::app_error::AppError;
use crate::b64;

pub const KEY_LEN: usize = 32;
pub const NONCE_LEN: usize = 24;
pub const SALT_LEN: usize = 16;

/// Argon2id cost settings. Stored in `vault.json` so a vault keeps opening
/// after the defaults change.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KdfParams {
    pub memory_kib: u32,
    pub iterations: u32,
    pub parallelism: u32,
}

pub const DEFAULT_KDF: KdfParams = KdfParams {
    memory_kib: 64 * 1024,
    iterations: 3,
    parallelism: 1,
};

/// The key derived from the passphrase. Wiped from memory when dropped,
/// never cloned, and never printed. The bytes live on the heap so moving a
/// `VaultKey` moves a pointer and leaves no copy of the key behind.
#[derive(ZeroizeOnDrop)]
pub struct VaultKey(Box<[u8; KEY_LEN]>);

impl fmt::Debug for VaultKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("VaultKey(..)")
    }
}

/// A nonce and the ciphertext it produced. Neither is secret.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Sealed {
    #[serde(with = "b64::array")]
    pub nonce: [u8; NONCE_LEN],
    #[serde(with = "b64::vec")]
    pub ciphertext: Vec<u8>,
}

pub fn new_salt() -> Result<[u8; SALT_LEN], AppError> {
    let mut salt = [0; SALT_LEN];
    getrandom::fill(&mut salt).map_err(AppError::Random)?;
    Ok(salt)
}

/// Whether Argon2 accepts these settings.
pub fn check_kdf(params: &KdfParams) -> Result<(), argon2::Error> {
    argon2_params(params).map(|_| ())
}

fn argon2_params(params: &KdfParams) -> Result<Params, argon2::Error> {
    Params::new(
        params.memory_kib,
        params.iterations,
        params.parallelism,
        Some(KEY_LEN),
    )
}

pub fn derive_key(
    passphrase: &str,
    salt: &[u8; SALT_LEN],
    params: &KdfParams,
) -> Result<VaultKey, AppError> {
    let params = argon2_params(params).map_err(AppError::KeyDerivation)?;
    // Argon2's working memory holds the key's direct preimage, so it is
    // allocated here and wiped on drop instead of being freed as is.
    let mut blocks = Zeroizing::new(vec![Block::default(); params.block_count()]);
    let mut key = VaultKey(Box::new([0; KEY_LEN]));
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into_with_memory(passphrase.as_bytes(), salt, &mut key.0[..], &mut *blocks)
        .map_err(AppError::KeyDerivation)?;
    Ok(key)
}

/// Encrypts `plaintext` under a fresh random nonce. `aad` is authenticated but
/// not encrypted; Hush passes the entry's file path so a file moved to another
/// path fails to decrypt.
pub fn encrypt(key: &VaultKey, aad: &[u8], plaintext: &[u8]) -> Result<Sealed, AppError> {
    let nonce = XNonce::try_generate().map_err(AppError::Random)?;
    let ciphertext = cipher(key)
        .encrypt(
            &nonce,
            Payload {
                msg: plaintext,
                aad,
            },
        )
        .map_err(|_| AppError::Encryption)?;
    Ok(Sealed {
        nonce: nonce.into(),
        ciphertext,
    })
}

pub fn decrypt(key: &VaultKey, aad: &[u8], sealed: &Sealed) -> Result<Vec<u8>, AppError> {
    cipher(key)
        .decrypt(
            &XNonce::from(sealed.nonce),
            Payload {
                msg: &sealed.ciphertext,
                aad,
            },
        )
        .map_err(|_| AppError::Decryption)
}

fn cipher(key: &VaultKey) -> XChaCha20Poly1305 {
    XChaCha20Poly1305::new((&*key.0).into())
}

#[cfg(test)]
mod tests {
    use super::*;

    const SALT: [u8; SALT_LEN] = *b"0123456789abcdef";
    const PATH: &[u8] = b"entries/2026/2026-10-29.enc";

    /// Cheap settings so the tests stay fast; the code path is the same.
    const TEST_KDF: KdfParams = KdfParams {
        memory_kib: 8,
        iterations: 1,
        parallelism: 1,
    };

    fn key(passphrase: &str) -> VaultKey {
        derive_key(passphrase, &SALT, &TEST_KDF).unwrap()
    }

    #[test]
    fn decrypts_what_it_encrypted() {
        let key = key("correct horse");
        let sealed = encrypt(&key, PATH, "今日は晴れ".as_bytes()).unwrap();
        assert_eq!(
            decrypt(&key, PATH, &sealed).unwrap(),
            "今日は晴れ".as_bytes()
        );
    }

    #[test]
    fn wrong_passphrase_fails() {
        let sealed = encrypt(&key("correct horse"), PATH, b"diary").unwrap();
        let err = decrypt(&key("wrong horse"), PATH, &sealed).unwrap_err();
        assert!(matches!(err, AppError::Decryption));
    }

    #[test]
    fn same_passphrase_with_another_salt_fails() {
        let sealed = encrypt(&key("correct horse"), PATH, b"diary").unwrap();
        let other = derive_key("correct horse", b"fedcba9876543210", &TEST_KDF).unwrap();
        assert!(decrypt(&other, PATH, &sealed).is_err());
    }

    #[test]
    fn entry_moved_to_another_path_fails() {
        let key = key("correct horse");
        let sealed = encrypt(&key, PATH, b"diary").unwrap();
        assert!(decrypt(&key, b"entries/2026/2026-10-30.enc", &sealed).is_err());
    }

    #[test]
    fn altered_ciphertext_fails() {
        let key = key("correct horse");
        let mut sealed = encrypt(&key, PATH, b"diary").unwrap();
        sealed.ciphertext[0] ^= 1;
        assert!(decrypt(&key, PATH, &sealed).is_err());
    }

    #[test]
    fn each_encryption_uses_a_new_nonce() {
        let key = key("correct horse");
        let a = encrypt(&key, PATH, b"diary").unwrap();
        let b = encrypt(&key, PATH, b"diary").unwrap();
        assert_ne!(a.nonce, b.nonce);
        assert_ne!(a.ciphertext, b.ciphertext);
    }

    #[test]
    fn debug_never_shows_the_key() {
        assert_eq!(format!("{:?}", key("correct horse")), "VaultKey(..)");
    }

    #[test]
    fn a_new_derivation_opens_what_an_earlier_one_sealed() {
        let sealed = encrypt(&key("correct horse"), PATH, b"diary").unwrap();
        assert_eq!(
            decrypt(&key("correct horse"), PATH, &sealed).unwrap(),
            b"diary"
        );
    }

    /// If this value changes, every existing vault stops opening. Change it
    /// only together with a vault format version bump.
    #[test]
    fn default_kdf_gives_the_known_key() {
        let key = derive_key(
            "correct horse battery staple",
            b"hush-test-salt!!",
            &DEFAULT_KDF,
        )
        .unwrap();
        let hex: String = key.0.iter().map(|b| format!("{b:02x}")).collect();
        assert_eq!(
            hex,
            "355ff41745b7e2e6220616e72f25657a4b451a372bae074de5f0a880933b8873"
        );
    }

    #[test]
    fn vault_key_is_wiped_on_drop() {
        fn wiped_on_drop<T: ZeroizeOnDrop>() {}
        wiped_on_drop::<VaultKey>();
    }
}
