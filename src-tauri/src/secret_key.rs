use std::fmt;

use zeroize::{ZeroizeOnDrop, Zeroizing};

use crate::app_error::AppError;

pub const SECRET_KEY_LEN: usize = 16;

/// Starts the text form and names its format, so a later format can be
/// told apart.
const TEXT_PREFIX: &str = "H1";

/// Crockford's Base32: no I, L, O, or U, so the text survives being copied
/// by hand.
const ALPHABET: &[u8; 32] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/// 128 bits in 5-bit symbols.
const SYMBOLS: usize = 26;

/// How the symbols are grouped in the text form.
const GROUPS: [usize; 5] = [5, 5, 5, 5, 6];

/// A random value kept on each device and mixed into the vault key with the
/// passphrase, so a leaked repository cannot be opened by guessing the
/// passphrase alone. Wiped on drop, never cloned, never printed.
#[derive(ZeroizeOnDrop)]
pub struct SecretKey(Box<[u8; SECRET_KEY_LEN]>);

impl fmt::Debug for SecretKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("SecretKey(..)")
    }
}

impl SecretKey {
    pub fn generate() -> Result<Self, AppError> {
        let mut key = SecretKey(Box::new([0; SECRET_KEY_LEN]));
        getrandom::fill(&mut key.0[..]).map_err(AppError::Random)?;
        Ok(key)
    }

    /// `None` unless `bytes` is exactly a key's length.
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() != SECRET_KEY_LEN {
            return None;
        }
        let mut key = SecretKey(Box::new([0; SECRET_KEY_LEN]));
        key.0.copy_from_slice(bytes);
        Some(key)
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.0[..]
    }

    /// The form people copy between devices, as in
    /// `H1-ABCDE-FGHJK-MNPQR-STVWX-YZ0123`.
    pub fn to_text(&self) -> Zeroizing<String> {
        let mut symbols = Zeroizing::new(Vec::with_capacity(SYMBOLS));
        let mut buffer: u16 = 0;
        let mut bits = 0;
        for &byte in self.0.iter() {
            buffer = (buffer << 8) | u16::from(byte);
            bits += 8;
            while bits >= 5 {
                bits -= 5;
                symbols.push(ALPHABET[usize::from((buffer >> bits) & 0x1f)]);
            }
        }
        symbols.push(ALPHABET[usize::from((buffer << (5 - bits)) & 0x1f)]);
        // Sized up front: a buffer that grows leaves unwiped copies behind.
        let mut text = Zeroizing::new(String::with_capacity(
            TEXT_PREFIX.len() + GROUPS.len() + SYMBOLS,
        ));
        text.push_str(TEXT_PREFIX);
        let mut rest = &symbols[..];
        for size in GROUPS {
            let (group, after) = rest.split_at(size);
            text.push('-');
            text.extend(group.iter().map(|&symbol| char::from(symbol)));
            rest = after;
        }
        text
    }

    /// Reads the text form. Case, spaces, and hyphens do not matter, and the
    /// letters people mistake for digits (O, I, L) read as those digits,
    /// in the prefix too.
    pub fn parse(text: &str) -> Result<Self, AppError> {
        // Sized up front: a buffer that grows leaves unwiped copies behind.
        let mut cleaned = Zeroizing::new(String::with_capacity(text.len()));
        for c in text.chars().filter(|c| !c.is_whitespace() && *c != '-') {
            cleaned.push(match c.to_ascii_uppercase() {
                'O' => '0',
                'I' | 'L' => '1',
                other => other,
            });
        }
        let body = cleaned
            .strip_prefix(TEXT_PREFIX)
            .filter(|body| body.len() == SYMBOLS)
            .ok_or(AppError::InvalidSecretKey)?;
        let mut key = SecretKey(Box::new([0; SECRET_KEY_LEN]));
        let mut buffer: u16 = 0;
        let mut bits = 0;
        let mut filled = 0;
        for c in body.chars() {
            let value = ALPHABET
                .iter()
                .position(|&symbol| char::from(symbol) == c)
                .ok_or(AppError::InvalidSecretKey)?;
            buffer = (buffer << 5) | u16::try_from(value).expect("an alphabet index is below 32");
            bits += 5;
            if bits >= 8 {
                bits -= 8;
                key.0[filled] = u8::try_from((buffer >> bits) & 0xff).expect("masked to 8 bits");
                filled += 1;
            }
        }
        // The last symbol carries 2 bits of padding; text from `to_text`
        // always has them zero.
        if buffer & ((1 << bits) - 1) != 0 {
            return Err(AppError::InvalidSecretKey);
        }
        Ok(key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(bytes: [u8; SECRET_KEY_LEN]) -> SecretKey {
        SecretKey::from_bytes(&bytes).unwrap()
    }

    #[test]
    fn the_text_form_reads_back_as_the_same_key() {
        for _ in 0..50 {
            let original = SecretKey::generate().unwrap();
            let reread = SecretKey::parse(&original.to_text()).unwrap();
            assert_eq!(reread.as_bytes(), original.as_bytes());
        }
    }

    /// Devices exchange this text, so its shape must not drift.
    #[test]
    fn the_text_form_of_a_known_key() {
        assert_eq!(
            &*key([0; SECRET_KEY_LEN]).to_text(),
            "H1-00000-00000-00000-00000-000000"
        );
        assert_eq!(
            &*key([0xff; SECRET_KEY_LEN]).to_text(),
            "H1-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZW"
        );
    }

    #[test]
    fn typed_text_is_read_forgivingly() {
        let original = key([0xff; SECRET_KEY_LEN]);
        let typed = "hl zzzzz zzzzz zzzzzzzzzz-zzzzz w";
        assert_eq!(
            SecretKey::parse(typed).unwrap().as_bytes(),
            original.as_bytes()
        );
        let zeros = "H1-OOOOO-00000-00000-00000-000000";
        assert_eq!(
            SecretKey::parse(zeros).unwrap().as_bytes(),
            [0; SECRET_KEY_LEN]
        );
    }

    #[test]
    fn text_that_is_not_a_secret_key_is_refused() {
        for text in [
            "",
            "H1-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ",
            "H1-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZWZ",
            "H2-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZW",
            "H1-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZU",
            "H1-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZZ",
        ] {
            assert!(
                matches!(SecretKey::parse(text), Err(AppError::InvalidSecretKey)),
                "{text:?} was accepted"
            );
        }
    }

    #[test]
    fn only_bytes_of_a_keys_length_make_a_key() {
        assert!(SecretKey::from_bytes(&[0; SECRET_KEY_LEN - 1]).is_none());
        assert!(SecretKey::from_bytes(&[0; SECRET_KEY_LEN + 1]).is_none());
    }

    #[test]
    fn debug_never_shows_the_key() {
        assert_eq!(format!("{:?}", key([1; SECRET_KEY_LEN])), "SecretKey(..)");
    }
}
