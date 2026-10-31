use std::fmt;

use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::XChaCha20Poly1305;
use chacha20poly1305::XNonce;
use chacha20poly1305::aead::{Aead, Generate, KeyInit, Payload};
use zeroize::ZeroizeOnDrop;

use crate::app_error::AppError;

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
/// never cloned, and never printed.
#[derive(ZeroizeOnDrop)]
pub struct VaultKey([u8; KEY_LEN]);

impl fmt::Debug for VaultKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("VaultKey(..)")
    }
}

/// A nonce and the ciphertext it produced. Neither is secret.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Sealed {
    pub nonce: [u8; NONCE_LEN],
    pub ciphertext: Vec<u8>,
}

pub fn derive_key(
    passphrase: &str,
    salt: &[u8; SALT_LEN],
    params: &KdfParams,
) -> Result<VaultKey, AppError> {
    let params = Params::new(
        params.memory_kib,
        params.iterations,
        params.parallelism,
        Some(KEY_LEN),
    )
    .map_err(AppError::KeyDerivation)?;
    let mut key = VaultKey([0; KEY_LEN]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(passphrase.as_bytes(), salt, &mut key.0)
        .map_err(AppError::KeyDerivation)?;
    Ok(key)
}

/// Encrypts `plaintext` under a fresh random nonce. `aad` is authenticated but
/// not encrypted; Hush passes the entry's file path so a file moved to another
/// path fails to decrypt.
pub fn encrypt(key: &VaultKey, aad: &[u8], plaintext: &[u8]) -> Result<Sealed, AppError> {
    let nonce = XNonce::generate();
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
    XChaCha20Poly1305::new((&key.0).into())
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
}
