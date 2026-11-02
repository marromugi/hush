fn main() {
    // `generate_context!` embeds Info.plist into dev builds, but Cargo does
    // not know the crate reads it, so an edit alone would not rebuild.
    println!("cargo:rerun-if-changed=Info.plist");
    tauri_build::build()
}
