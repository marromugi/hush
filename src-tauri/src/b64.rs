//! Serde helpers that store bytes as standard Base64 strings in JSON.

pub mod array {
    use base64ct::{Base64, Encoding};
    use serde::{Deserialize, Deserializer, Serializer, de};

    pub fn serialize<S: Serializer, const N: usize>(
        bytes: &[u8; N],
        serializer: S,
    ) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&Base64::encode_string(bytes))
    }

    /// Fails unless the string decodes to exactly `N` bytes.
    pub fn deserialize<'de, D: Deserializer<'de>, const N: usize>(
        deserializer: D,
    ) -> Result<[u8; N], D::Error> {
        let text = String::deserialize(deserializer)?;
        let bytes = Base64::decode_vec(&text).map_err(de::Error::custom)?;
        bytes.try_into().map_err(|bytes: Vec<u8>| {
            de::Error::invalid_length(bytes.len(), &&*format!("{N} bytes"))
        })
    }
}

pub mod vec {
    use base64ct::{Base64, Encoding};
    use serde::{Deserialize, Deserializer, Serializer, de};

    pub fn serialize<S: Serializer>(bytes: &[u8], serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&Base64::encode_string(bytes))
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Vec<u8>, D::Error> {
        let text = String::deserialize(deserializer)?;
        Base64::decode_vec(&text).map_err(de::Error::custom)
    }
}
