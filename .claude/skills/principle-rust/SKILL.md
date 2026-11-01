---
name: principle-rust
description: "How Rust code is written in this repo (src-tauri/): Result for expected failures and panic only for bugs, one AppError sent to the frontend as kind and message, thin async Tauri commands, state behind a type alias, versioned file formats, and modules grouped by use. Use whenever writing, changing, or reviewing Rust under src-tauri/, adding a Tauri command, an error variant, app state, or a file format."
---

# Principle: Rust

Each rule carries its reason. A rule whose reason no longer holds for Hush should be changed, not followed.

Handling secrets in memory and in error text (wiping keys, keeping tokens out of messages) is not decided yet. It will be settled with the encryption work.

## Failure: Result or panic

**Return a `Result` for every failure that can happen in normal use. Panic (`unwrap`, `expect`) only on a bug.**
A wrong passphrase, an unreachable GitHub, and a broken entry file are normal use. A state the code should never reach is a bug.
When using `expect`, the message says why it cannot fail. Tests may `unwrap` freely.
Why: in a diary app, typos and network failures are everyday events, and an app that crashes on them can't be used. A bug that keeps running may save corrupted data, so stopping is safer.
(Microsoft `M-PANIC-IS-STOP`, `M-PANIC-ON-BUG`)

## One error type

**The app has one error type, `AppError`, built with `thiserror`. Each kind of failure is its own variant, and an error from another crate is kept as the variant's source.**

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("wrong passphrase")]
    WrongPassphrase,

    #[error("network error")]
    Network(#[from] reqwest::Error),

    #[error("entry file is broken")]
    BrokenEntry(#[source] serde_json::Error),

    #[error("vault file is broken")]
    BrokenVault(#[source] serde_json::Error),
}
```

Use `#[from]` only when every error of that foreign type means the same kind of failure, as with `reqwest::Error` here. When one foreign type can mean several kinds (a `serde_json::Error` from an entry versus from `vault.json`), use `#[source]` and pick the variant with `map_err` where the error happens: `.map_err(AppError::BrokenEntry)?`.
Why: two `#[from]` for the same type do not compile (conflicting `From` impls), and folding them into one variant loses the difference the frontend needs.

Why: the frontend reacts differently to each kind of failure (red input, retry button, "can't open this day"), so the kinds must be separate in the type. Tauri also requires a command's error to be `Serialize`, which `anyhow::Error` is not. One type means commands never convert between error types. Split it only if it grows too many variants to read.
(Microsoft `M-APP-ERROR` recommends `anyhow` for apps; Hush takes `thiserror` for the two reasons above. `M-FROM-ERROR` for `#[from]`.)

## Tauri commands

**A command takes its arguments, calls a plain function, and returns the result. Logic lives in that function.**

```rust
#[tauri::command]
pub async fn read_entry(date: String, state: State<'_, AppState>) -> Result<String, AppError> {
    entry::read(&state, &date) // entry::read takes &AppState, not State
}
```

The plain function takes `&AppState` or the plain data it needs, never `tauri::State`. `&State<AppState>` turns into `&AppState` on its own at the call.
Why: a plain function can be tested with `cargo test` without starting Tauri, but only if a test can build its arguments; `tauri::State` has no public constructor. This is the Rust side of "components render; logic lives elsewhere" in `principle-react`.

**`AppError` reaches the frontend as `{ kind, message }`. The frontend picks its words from `kind`; `message` is for debugging only.**

```rust
impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("AppError", 2)?;
        s.serialize_field("kind", self.kind())?; // "wrongPassphrase", "network", ...
        s.serialize_field("message", &self.debug_message())?;
        s.end()
    }
}

impl AppError {
    /// This error's text followed by each underlying error's text.
    fn debug_message(&self) -> String {
        let mut message = self.to_string();
        let mut source = std::error::Error::source(self);
        while let Some(error) = source {
            message.push_str(": ");
            message.push_str(&error.to_string());
            source = error.source();
        }
        message
    }
}
```

`to_string()` alone gives only the variant's own `#[error]` text ("network error"), not the underlying error, so `message` follows the source chain.
Why: the frontend branches on the kind. Rust error text can carry file paths or URLs and is not meant to be shown to people. What may appear in `message` once tokens are involved is decided with the secrets work.
([Tauri: Calling Rust, Error Handling](https://v2.tauri.app/develop/calling-rust/))

**Every command is an `async fn`.**
Why: a command without `async` runs on the main thread, and a slow one freezes the window. Making all of them async removes the need to judge each one. Because every command returns `Result`, borrowed arguments such as `State<'_, _>` work in async commands.
([Tauri: Calling Rust, Async Commands](https://v2.tauri.app/develop/calling-rust/))

**CPU-heavy work, such as Argon2 key derivation, runs in `tauri::async_runtime::spawn_blocking`.**

```rust
let key = tauri::async_runtime::spawn_blocking(move || crypto::derive_key(&passphrase)).await??;
```

The first `?` is the blocking task failing (`tauri::Error`, so `AppError` has a `#[from] tauri::Error` variant); the second is `derive_key`'s own error.
Why: async commands share a few threads meant for waiting on I/O. Half a second of hashing on one of them delays everything else, such as GitHub requests.
(Tauri source `async_runtime.rs`; leonardomso/rust-skills `async-spawn-blocking`)

**All commands live in `commands.rs`, are `pub`, and are registered in one `generate_handler!` in `lib.rs`. Command names never repeat.**
Why: Tauri requires commands outside `lib.rs` to be `pub`, uses only the last `invoke_handler` call, and does not scope command names by module.
([Tauri: Calling Rust, Commands in a Separate Module](https://v2.tauri.app/develop/calling-rust/))

## App state

**Give the state type an alias, `type AppState = Mutex<AppStateInner>;`, and always take `State<'_, AppState>`.**
Why: using the wrong type in `State<...>` is not a compile error; the command fails only when the frontend calls it. The alias rules out a missing or doubled `Mutex`. Tauri adds the `Arc` itself.
([Tauri: State Management](https://v2.tauri.app/develop/state-management/))

**Use `std::sync::Mutex`. Copy what you need out of it and release the lock before any `.await`.**

```rust
let token = {
    let inner = state.lock().expect("state lock is only poisoned by an earlier panic");
    inner.session.as_ref().ok_or(AppError::Locked)?.token.clone()
}; // lock released here
github::put_entry(&token, entry).await?;
```

Why: holding the lock across a wait stops every other command from touching the state. Releasing it first also means the async `Mutex` is never needed. A poisoned lock means an earlier panic, which is a bug, so `expect` is right.
([Tauri: State Management](https://v2.tauri.app/develop/state-management/); Microsoft `M-PANIC-IS-STOP`)

## File formats

The same repository is read by the Mac and the iPhone, which may run different versions of the app.

**When a file's shape changes, bump its `version`. A file with a version the app doesn't know is not read; it is an error that asks for an app update.**
Why: an older app that quietly reads a newer file drops the fields it doesn't know, and saving the entry then erases them.

**Read `version` on its own first, then parse the whole file.**

```rust
#[derive(Deserialize)]
struct VersionOnly {
    version: u32,
}

let VersionOnly { version } = serde_json::from_str(text).map_err(AppError::BrokenVault)?;
if version > VAULT_VERSION {
    return Err(AppError::NewerVaultVersion(version));
}
let vault: Vault = serde_json::from_str(text).map_err(AppError::BrokenVault)?;
```

`VersionOnly` has no `deny_unknown_fields`, so it reads the version from any file.
Why: parsing the full struct first fails on the new fields before the version is ever compared, and the app reports a broken file instead of asking for an update.

**File structs carry `#[serde(deny_unknown_fields)]`.**
Why: once the version is known to match, an unknown field means a bug or a broken file, so reading stops there.
(leonardomso/rust-skills `serde-deny-unknown-fields`. That rule skips extensible structs; Hush handles extension through the version instead.)

**A field added in a later version gets `#[serde(default)]` on that field only, never on the whole struct.**
Why: the newer app can still read older files. On the whole struct it would also let a misspelled field name pass.
(leonardomso/rust-skills `serde-default-compat`)

**A value with rules (24-byte nonce, 16-byte salt, `YYYY-MM-DD` date) gets a type that can only hold a valid value, read through `#[serde(try_from = "...")]`.**
Why: an invalid value fails at read time instead of being used because someone forgot to check it.
(leonardomso/rust-skills `serde-try-from-validate`)

**Format versions and crypto parameters are named constants, never bare numbers.**
`const VAULT_VERSION: u32 = 1;`, `const NONCE_LEN: usize = 24;`
Why: a bare number says nothing about what it is and can't be searched for when it has to change.
(Microsoft `M-DOCUMENTED-MAGIC`)

## Modules

**Group modules by use, and name each after its main item: `AppError` in `app_error.rs`, vault format in `vault.rs`, GitHub client in `github.rs`.** `commands.rs` is the one exception and holds every command.
Why: the name tells where a thing is. Commands are kept together because their names share one namespace, so a clash is visible in one file.
(BeautifulRust §9)

**When a module becomes a directory, use `vault.rs` with `vault/`, not `vault/mod.rs`.**
Why: a row of `mod.rs` tabs in the editor can't be told apart.

**Re-export items one by one (`pub use foo::{A, B};`). No glob re-exports, no prelude.**
Why: every name's origin stays visible where it is used.
(BeautifulRust §9)

**Tests live at the bottom of the file they test, in `#[cfg(test)] mod tests`.**
Why: the test sits next to the code, the same as on the frontend (`principle-structure`).

## Not taken

- Stricter clippy sets (`pedantic`, `restriction`), recommended by Microsoft `M-STATIC-VERIFICATION` and BeautifulRust: Hush keeps clippy's defaults with `-D warnings`. Raising it is a lint change of its own.
- Library and API-design rules (Rust API Guidelines, Microsoft `libs/*`, `M-SINGLE-ITEM-PATH`): they concern items published to other crates. Hush is one application crate.
- `unsafe`, FFI, macros, and performance tuning: nothing in Hush needs them yet.
