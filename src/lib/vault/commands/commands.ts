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

/** Saves `jpeg` as a new encrypted image and resolves with its id. */
export function saveImage(jpeg: Uint8Array): Promise<string> {
  return call("save_image", jpeg);
}

/** The JPEG saved as `id`. */
export function readImage(id: string): Promise<ArrayBuffer> {
  return call("read_image", { id });
}

/** The vault's Secret Key as text, from this device's keychain. Only while unlocked. */
export function showSecretKey(): Promise<string> {
  return call("show_secret_key");
}

/** Sent by the Rust side (`lock_signals::LOCK_REQUESTED`) on sleep, screen lock, or user switch. */
const LOCK_REQUESTED = "lock-requested";

/** Calls `onRequest` each time the system asks the vault to lock. */
export function listenLockRequests(onRequest: () => void): Promise<UnlistenFn> {
  return listen(LOCK_REQUESTED, () => onRequest());
}
