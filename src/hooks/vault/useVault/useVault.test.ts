import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { useVault } from "./useVault";

afterEach(() => {
  clearMocks();
});

/** A fake Rust side with one locked vault whose passphrase is "correct". */
function fakeVault() {
  let status = "locked";
  mockIPC((command, args) => {
    switch (command) {
      case "vault_status":
        return status;
      case "unlock_vault":
        if (args && "passphrase" in args && args.passphrase === "correct") {
          status = "unlocked";
          return null;
        }
        throw { kind: "wrongPassphrase", message: "wrong passphrase" };
      case "lock_vault":
        status = "locked";
        return null;
      default:
        throw new Error(`unexpected command ${command}`);
    }
  });
}

test("starts loading, then shows the status from the Rust side", async () => {
  fakeVault();
  const { result } = renderHook(() => useVault());
  expect(result.current.status).toBe("loading");
  await waitFor(() => expect(result.current.status).toBe("locked"));
});

test("unlocking with the right passphrase unlocks", async () => {
  fakeVault();
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("locked"));
  await act(() => result.current.unlock("correct"));
  expect(result.current.status).toBe("unlocked");
  expect(result.current.error).toBeNull();
});

test("a wrong passphrase stays locked and says why", async () => {
  fakeVault();
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("locked"));
  await act(() => result.current.unlock("nope"));
  expect(result.current.status).toBe("locked");
  expect(result.current.error?.kind).toBe("wrongPassphrase");
  expect(result.current.busy).toBe(false);
});

test("is busy while an unlock runs", async () => {
  let finish: (() => void) | undefined;
  mockIPC((command) =>
    command === "vault_status"
      ? "locked"
      : new Promise<null>((resolve) => {
          finish = () => resolve(null);
        }),
  );
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("locked"));
  let pending: Promise<void> = Promise.resolve();
  act(() => {
    pending = result.current.unlock("correct");
  });
  expect(result.current.busy).toBe(true);
  await act(async () => {
    finish?.();
    await pending;
  });
  expect(result.current.busy).toBe(false);
});
