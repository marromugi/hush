use serde::Deserialize;

#[derive(Deserialize)]
struct VersionOnly {
    version: u32,
}

/// Reads only the `version` field, ignoring every other field. A file's
/// version is checked with this before the whole file is parsed, so a newer
/// file is reported as newer rather than as broken.
pub fn read_version(text: &str) -> Result<u32, serde_json::Error> {
    serde_json::from_str::<VersionOnly>(text).map(|v| v.version)
}
