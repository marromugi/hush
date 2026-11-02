import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, expect, test } from "vitest";

import { HushError } from "@/lib/vault/hushError";

import {
  createVault,
  listEntryDates,
  lockVault,
  readEntry,
  saveEntry,
  showSecretKey,
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
  await unlockVault("pass", "H1-ABCDE");
  await lockVault();
  await readEntry("2026-10-29");
  await saveEntry("2026-10-29", "晴れ", null);
  await saveEntry("2026-10-29", "晴れ", {
    id: "klee-one",
    family: "Klee One",
    category: "handwriting",
    stylesheet: "css/klee",
  });
  await listEntryDates();
  await showSecretKey();
  expect(calls).toEqual([
    ["vault_status", {}],
    ["create_vault", { passphrase: "pass" }],
    ["unlock_vault", { passphrase: "pass" }],
    ["unlock_vault", { passphrase: "pass", secretKey: "H1-ABCDE" }],
    ["lock_vault", {}],
    ["read_entry", { date: "2026-10-29" }],
    ["save_entry", { date: "2026-10-29", body: "晴れ", font: null }],
    [
      "save_entry",
      {
        date: "2026-10-29",
        body: "晴れ",
        font: {
          id: "klee-one",
          family: "Klee One",
          category: "handwriting",
          stylesheet: "css/klee",
        },
      },
    ],
    ["list_entry_dates", {}],
    ["show_secret_key", {}],
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
