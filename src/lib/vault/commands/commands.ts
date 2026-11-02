import { invoke } from "@tauri-apps/api/core";

import { toHushError } from "../hushError";

/** `needsSecretKey`: locked, on a device that has no Secret Key for the vault yet. */
export type VaultStatus = "missing" | "needsSecretKey" | "locked" | "unlocked";

export type EntryView = {
  date: string;
  body: string;
  createdAtMs: number;
  updatedAtMs: number;
};

/** Calls a Rust command; a failure is always rejected as a `HushError`. */
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
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

export function saveEntry(date: string, body: string): Promise<EntryView> {
  return call("save_entry", { date, body });
}

/** Every date that has an entry, oldest first, as YYYY-MM-DD. */
export function listEntryDates(): Promise<string[]> {
  return call("list_entry_dates");
}
