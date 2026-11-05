use serde::{Deserialize, Serialize, de};

use crate::b64;
use crate::core_error::CoreError;
use crate::crypto::{self, NONCE_LEN, Sealed, VaultKey};
use crate::file_version::read_version;

/// Current image file format. Bump when a field is added or changed, or when
/// the file starts holding another kind of picture. Version 1 held only
/// JPEG; from 2 it holds any `PictureFormat`.
pub const IMAGE_VERSION: u32 = 2;

/// Random bytes in an image's id.
const IMAGE_ID_LEN: usize = 16;

/// The first bytes of every JPEG (SOI marker and the next marker's start).
const JPEG_START: &[u8] = &[0xFF, 0xD8, 0xFF];

/// The PNG signature.
const PNG_START: &[u8] = &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];

/// The start of both GIF headers, `GIF87a` and `GIF89a`.
const GIF_START: &[u8] = b"GIF8";

/// The name of an image file: 32 lowercase hex digits, chosen at random, so
/// the name says nothing about the picture.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub struct ImageId(String);

impl ImageId {
    pub fn new() -> Result<Self, CoreError> {
        let mut bytes = [0; IMAGE_ID_LEN];
        getrandom::fill(&mut bytes).map_err(CoreError::Random)?;
        Ok(ImageId(bytes.iter().map(|b| format!("{b:02x}")).collect()))
    }

    /// Where the image lives in the repository, e.g. `images/0123….enc`.
    /// Also the associated data of its encryption, so a file moved to
    /// another id fails to decrypt.
    pub fn path(&self) -> String {
        format!("images/{}.enc", self.0)
    }
}

impl TryFrom<String> for ImageId {
    type Error = String;

    fn try_from(text: String) -> Result<Self, Self::Error> {
        let shaped = text.len() == IMAGE_ID_LEN * 2
            && text.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f'));
        if !shaped {
            return Err(format!("{text:?} is not an image id"));
        }
        Ok(ImageId(text))
    }
}

impl From<ImageId> for String {
    fn from(id: ImageId) -> String {
        id.0
    }
}

/// The kinds of picture an image file can hold.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PictureFormat {
    Jpeg,
    Png,
    Gif,
}

impl PictureFormat {
    /// The format `bytes` start as, if it is one of these.
    fn of(bytes: &[u8]) -> Option<Self> {
        [
            (JPEG_START, Self::Jpeg),
            (PNG_START, Self::Png),
            (GIF_START, Self::Gif),
        ]
        .into_iter()
        .find_map(|(start, format)| bytes.starts_with(start).then_some(format))
    }
}

/// The bytes of a picture in one of the `PictureFormat`s. Only bytes that
/// start as one can be a picture; the rest is not checked.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Picture(Vec<u8>);

impl TryFrom<Vec<u8>> for Picture {
    type Error = CoreError;

    fn try_from(bytes: Vec<u8>) -> Result<Self, Self::Error> {
        if PictureFormat::of(&bytes).is_none() {
            return Err(CoreError::UnsupportedPicture);
        }
        Ok(Picture(bytes))
    }
}

impl From<Picture> for Vec<u8> {
    fn from(picture: Picture) -> Vec<u8> {
        picture.0
    }
}

/// The contents of an image file: the version and the encrypted picture.
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct ImageFile {
    version: u32,
    #[serde(with = "b64::array")]
    nonce: [u8; NONCE_LEN],
    #[serde(with = "b64::vec")]
    ciphertext: Vec<u8>,
}

/// Encrypts `picture` and returns the text of its image file at `id`.
pub fn seal(key: &VaultKey, id: &ImageId, picture: &Picture) -> Result<String, CoreError> {
    let Sealed { nonce, ciphertext } = crypto::encrypt(key, id.path().as_bytes(), &picture.0)?;
    let file = ImageFile {
        version: IMAGE_VERSION,
        nonce,
        ciphertext,
    };
    Ok(serde_json::to_string_pretty(&file)
        .expect("image file fields are plain strings and numbers"))
}

/// Decrypts the image file `text` that was read from `id`'s path. The
/// version is read first, so a file written by a newer app asks for an
/// update instead of being reported as broken.
pub fn open(key: &VaultKey, id: &ImageId, text: &str) -> Result<Picture, CoreError> {
    let version = read_version(text).map_err(CoreError::BrokenImage)?;
    if version > IMAGE_VERSION {
        return Err(CoreError::NewerImageVersion(version));
    }
    if version == 0 {
        return Err(CoreError::BrokenImage(de::Error::custom(format!(
            "unknown version {version}"
        ))));
    }
    let file: ImageFile = serde_json::from_str(text).map_err(CoreError::BrokenImage)?;
    let plaintext = crypto::decrypt(
        key,
        id.path().as_bytes(),
        &Sealed {
            nonce: file.nonce,
            ciphertext: file.ciphertext,
        },
    )?;
    Picture::try_from(plaintext).map_err(|_| {
        CoreError::BrokenImage(de::Error::custom("decrypted image is not a known picture"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::{KdfParams, SALT_LEN, derive_key};
    use crate::secret_key::{SECRET_KEY_LEN, SecretKey};

    fn key(byte: u8) -> VaultKey {
        let secret = SecretKey::from_bytes(&[byte; SECRET_KEY_LEN]).unwrap();
        let params = KdfParams {
            memory_kib: 8,
            iterations: 1,
            parallelism: 1,
        };
        derive_key("correct horse", &secret, &[0; SALT_LEN], &params).unwrap()
    }

    fn id(text: &str) -> ImageId {
        ImageId::try_from(text.to_string()).unwrap()
    }

    fn jpeg() -> Picture {
        Picture::try_from(vec![0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3]).unwrap()
    }

    const ID: &str = "0123456789abcdef0123456789abcdef";

    #[test]
    fn opens_what_it_sealed() {
        let key = key(1);
        let text = seal(&key, &id(ID), &jpeg()).unwrap();
        assert_eq!(open(&key, &id(ID), &text).unwrap(), jpeg());
    }

    #[test]
    fn a_file_read_from_another_id_fails() {
        let key = key(1);
        let text = seal(&key, &id(ID), &jpeg()).unwrap();
        let other = id("fedcba9876543210fedcba9876543210");
        assert!(matches!(
            open(&key, &other, &text),
            Err(CoreError::Decryption)
        ));
    }

    #[test]
    fn path_is_under_images() {
        assert_eq!(id(ID).path(), format!("images/{ID}.enc"));
    }

    #[test]
    fn new_ids_are_well_formed_and_differ() {
        let (a, b) = (ImageId::new().unwrap(), ImageId::new().unwrap());
        assert_ne!(a, b);
        assert!(ImageId::try_from(String::from(a)).is_ok());
    }

    #[test]
    fn malformed_ids_are_refused() {
        for text in [
            "",
            "0123456789ABCDEF0123456789ABCDEF",
            "0123456789abcdef0123456789abcde",
            "../../vault.json000000000000000",
        ] {
            assert!(ImageId::try_from(text.to_string()).is_err(), "{text}");
        }
    }

    #[test]
    fn jpeg_png_and_gif_are_pictures() {
        for bytes in [
            vec![0xFF, 0xD8, 0xFF, 0xE0],
            b"\x89PNG\r\n\x1a\n\0\0".to_vec(),
            b"GIF87a".to_vec(),
            b"GIF89a".to_vec(),
        ] {
            assert!(Picture::try_from(bytes).is_ok());
        }
    }

    #[test]
    fn other_bytes_are_refused() {
        for bytes in [
            b"RIFF\0\0\0\0WEBP".to_vec(),
            b"\x89PNX".to_vec(),
            Vec::new(),
        ] {
            assert!(matches!(
                Picture::try_from(bytes),
                Err(CoreError::UnsupportedPicture)
            ));
        }
    }

    #[test]
    fn a_version_1_file_still_opens() {
        let key = key(1);
        let sealed = crypto::encrypt(&key, id(ID).path().as_bytes(), &jpeg().0).unwrap();
        let text = serde_json::to_string(&ImageFile {
            version: 1,
            nonce: sealed.nonce,
            ciphertext: sealed.ciphertext,
        })
        .unwrap();
        assert_eq!(open(&key, &id(ID), &text).unwrap(), jpeg());
    }

    #[test]
    fn newer_version_asks_for_an_update() {
        let text = r#"{"version":3,"nonce":"","ciphertext":"","mediaType":"image/webp"}"#;
        assert!(matches!(
            open(&key(1), &id(ID), text),
            Err(CoreError::NewerImageVersion(3))
        ));
    }

    #[test]
    fn version_zero_is_broken() {
        let text = r#"{"version":0}"#;
        assert!(matches!(
            open(&key(1), &id(ID), text),
            Err(CoreError::BrokenImage(_))
        ));
    }

    #[test]
    fn a_sealed_file_that_is_not_a_jpeg_inside_is_broken() {
        let key = key(1);
        let sealed = crypto::encrypt(&key, id(ID).path().as_bytes(), b"not a picture").unwrap();
        let text = serde_json::to_string(&ImageFile {
            version: IMAGE_VERSION,
            nonce: sealed.nonce,
            ciphertext: sealed.ciphertext,
        })
        .unwrap();
        assert!(matches!(
            open(&key, &id(ID), &text),
            Err(CoreError::BrokenImage(_))
        ));
    }
}
