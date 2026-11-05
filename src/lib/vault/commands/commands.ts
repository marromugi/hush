import { invoke } from "@tauri-apps/api/core";
import type { InvokeArgs } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import type { SavedFont } from "@/lib/diary/fonts";
import { toHushError } from "@/lib/vault/hushError";

/** `needsSecretKey`: locked, on a device that has no Secret Key for the vault yet. */
export type VaultStatus = "missing" | "needsSecretKey" | "locked" | "unlocked";

export type EntryView = {
  date: string;
  body: string;
  createdAtMs: number;
  updatedAtMs: number;
  /** `null` shows the entry in the reader's default font. */
  font: SavedFont | null;
};

/** Calls a Rust command; a failure is always rejected as a `HushError`. */
async function call<T>(command: string, args?: InvokeArgs): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw toHushError(error);
  }
}

export function vaultStatus(): Promise<VaultStatus> {
  return call("vault_status");
}

/** Resolves with the new vault's Secret Key, for the person to keep. */
export function createVault(passphrase: string): Promise<string> {
  return call("create_vault", { passphrase });
}

/** `secretKey` is given only on a device that does not have it yet. */
export function unlockVault(passphrase: string, secretKey?: string): Promise<void> {
  return call("unlock_vault", { passphrase, secretKey });
}

/** How this device recognizes its owner. */
export type Biometry = "touchId" | "faceId" | "opticId";

export type BiometryStatus = {
  /** `null` when the device has no biometry set up. */
  biometry: Biometry | null;
  /** Whether the vault opens with it on this device. */
  on: boolean;
};

export function biometryStatus(): Promise<BiometryStatus> {
  return call("biometry_status");
}

/** Lets the vault open with Touch ID or Face ID on this device. Only while unlocked. */
export function turnOnBiometry(): Promise<void> {
  return call("turn_on_biometry");
}

export function turnOffBiometry(): Promise<void> {
  return call("turn_off_biometry");
}

/** Asks for Touch ID or Face ID, showing `reason` where the system has room for it. */
export function unlockWithBiometry(reason: string): Promise<void> {
  return call("unlock_with_biometry", { reason });
}

export function lockVault(): Promise<void> {
  return call("lock_vault");
}

/** `null` when nothing has been written on `date` (YYYY-MM-DD). */
export function readEntry(date: string): Promise<EntryView | null> {
  return call("read_entry", { date });
}

export function saveEntry(date: string, body: string, font: SavedFont | null): Promise<EntryView> {
  return call("save_entry", { date, body, font });
}

/** Every date that has an entry, oldest first, as YYYY-MM-DD. */
export function listEntryDates(): Promise<string[]> {
  return call("list_entry_dates");
}

/** Saves `picture`, a JPEG, PNG, or GIF, as a new encrypted image and resolves with its id. */
export function saveImage(picture: Uint8Array): Promise<string> {
  return call("save_image", picture);
}

/** The picture saved as `id`: a JPEG, PNG, or GIF. */
export function readImage(id: string): Promise<ArrayBuffer> {
  return call("read_image", { id });
}

/** The vault's Secret Key as text, from this device's keychain. Only while unlocked. */
export function showSecretKey(): Promise<string> {
  return call("show_secret_key");
}

let embedPages: Promise<string> | null = null;

/**
 * Where the pages YouTube videos are shown in are served from, as
 * `http://127.0.0.1:{port}`. The server runs as long as the app does, so
 * the answer is asked once and kept, a failure too.
 */
export function embedPagesOrigin(): Promise<string> {
  embedPages ??= call("embed_pages_origin");
  return embedPages;
}

/** Sent by the Rust side (`lock_signals::LOCK_REQUESTED`) on sleep, screen lock, user switch, or leaving the app on iOS. */
const LOCK_REQUESTED = "lock-requested";

/** Calls `onRequest` each time the system asks the vault to lock. */
export function listenLockRequests(onRequest: () => void): Promise<UnlistenFn> {
  return listen(LOCK_REQUESTED, () => onRequest());
}

/** Sent by the Rust side (`full_screen::KEYBOARD_MOVED`) on iOS once the webview has been fitted above the on-screen keyboard. */
const KEYBOARD_MOVED = "keyboard-moved";

/** Calls `onMove` each time the on-screen keyboard has moved and the window was resized to fit. Never on the desktop. */
export function listenKeyboardMoves(onMove: () => void): Promise<UnlistenFn> {
  return listen(KEYBOARD_MOVED, () => onMove());
}

/** One of the person's playlists in the Music app (`music::Playlist`). `id` differs between devices. */
export type Playlist = { id: string; name: string };

/** What the settings can offer (`music::Playlists`). */
export type Playlists =
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "listed"; playlists: Playlist[] };

/** The person's playlists. The first time, the system asks whether Hush may use the Music app. */
export function musicPlaylists(): Promise<Playlists> {
  return call("music_playlists");
}

/** The playlist's artwork as a small `data:` URL; null when it has none. */
export function playlistArtwork(id: string): Promise<string | null> {
  return call("playlist_artwork", { id });
}

/** Starts the playlist in the Music app, shuffled. */
export function playPlaylist(id: string): Promise<void> {
  return call("play_playlist", { id });
}
