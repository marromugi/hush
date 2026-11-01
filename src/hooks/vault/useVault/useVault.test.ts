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

test("a second unlock while one runs is ignored", async () => {
  let finish: (() => void) | undefined;
  let unlockCalls = 0;
  mockIPC((command) => {
    if (command === "vault_status") return "locked";
    unlockCalls += 1;
    return new Promise<null>((resolve) => {
      finish = () => resolve(null);
    });
  });
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("locked"));

  let first: Promise<void> = Promise.resolve();
  act(() => {
    first = result.current.unlock("correct");
  });
  await act(() => result.current.unlock("correct"));
  expect(unlockCalls).toBe(1);
  expect(result.current.busy).toBe(true);

  await act(async () => {
    finish?.();
    await first;
  });
  expect(result.current.busy).toBe(false);
  expect(result.current.status).toBe("unlocked");
});

test("a first status that arrives after an unlock does not undo it", async () => {
  let answerStatus: ((status: string) => void) | undefined;
  mockIPC((command) => {
    if (command === "vault_status") {
      return new Promise<string>((resolve) => {
        answerStatus = resolve;
      });
    }
    return null;
  });
  const { result } = renderHook(() => useVault());
  await act(() => result.current.unlock("correct"));
  expect(result.current.status).toBe("unlocked");

  await act(async () => {
    answerStatus?.("locked");
    await Promise.resolve();
  });
  expect(result.current.status).toBe("unlocked");
});
