import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, expect, test } from "vitest";

import { HushError } from "../hushError";
import {
  createVault,
  listEntryDates,
  lockVault,
  readEntry,
  saveEntry,
  unlockVault,
  vaultStatus,
} from "./commands";

afterEach(() => {
  clearMocks();
});

test("sends the command names and arguments the Rust side expects", async () => {
  const calls: Array<[string, unknown]> = [];
  mockIPC((command, args) => {
    calls.push([command, args]);
    return null;
  });
  await vaultStatus();
  await createVault("pass");
  await unlockVault("pass");
  await lockVault();
  await readEntry("2026-10-29");
  await saveEntry("2026-10-29", "晴れ");
  await listEntryDates();
  expect(calls).toEqual([
    ["vault_status", {}],
    ["create_vault", { passphrase: "pass" }],
    ["unlock_vault", { passphrase: "pass" }],
    ["lock_vault", {}],
    ["read_entry", { date: "2026-10-29" }],
    ["save_entry", { date: "2026-10-29", body: "晴れ" }],
    ["list_entry_dates", {}],
  ]);
});

test("returns what the command returns", async () => {
  mockIPC(() => "locked");
  await expect(vaultStatus()).resolves.toBe("locked");
});

test("a failing command rejects with a HushError of its kind", async () => {
  mockIPC(() => {
    throw { kind: "wrongPassphrase", message: "wrong passphrase" };
  });
  const error: unknown = await unlockVault("nope").catch((e: unknown) => e);
  expect(error).toBeInstanceOf(HushError);
  expect(error).toMatchObject({ kind: "wrongPassphrase" });
});
