import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as toasts from "@/lib/ui/toast";

import { useVault } from "./useVault";

afterEach(() => {
  clearMocks();
  vi.restoreAllMocks();
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

test("creating shows the new Secret Key until it is kept", async () => {
  mockIPC((command) => {
    if (command === "vault_status") return "missing";
    if (command === "create_vault") return "H1-ABCDE-FGHJK-MNPQR-STVWX-YZ0123";
    throw new Error(`unexpected command ${command}`);
  });
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("missing"));
  await act(() => result.current.create("correct"));
  expect(result.current.status).toBe("unlocked");
  expect(result.current.newSecretKey).toBe("H1-ABCDE-FGHJK-MNPQR-STVWX-YZ0123");
  act(() => result.current.keptSecretKey());
  expect(result.current.newSecretKey).toBeNull();
});

test("a device without the Secret Key opens with it typed", async () => {
  const calls: unknown[] = [];
  mockIPC((command, args) => {
    if (command === "vault_status") return "needsSecretKey";
    if (command === "unlock_vault") {
      calls.push(args);
      return null;
    }
    throw new Error(`unexpected command ${command}`);
  });
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("needsSecretKey"));
  await act(() => result.current.unlock("correct", "H1-ABCDE"));
  expect(calls).toEqual([{ passphrase: "correct", secretKey: "H1-ABCDE" }]);
  expect(result.current.status).toBe("unlocked");
});

test("when the Secret Key is gone from the device, unlocking asks for it", async () => {
  mockIPC((command) => {
    if (command === "vault_status") return "locked";
    throw { kind: "noSecretKey", message: "this device has no secret key for the vault" };
  });
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("locked"));
  await act(() => result.current.unlock("correct"));
  expect(result.current.status).toBe("needsSecretKey");
});

test("locking before the new Secret Key is kept stops showing it", async () => {
  mockIPC((command) => {
    if (command === "vault_status") return "missing";
    if (command === "create_vault") return "H1-ABCDE-FGHJK-MNPQR-STVWX-YZ0123";
    if (command === "lock_vault") return null;
    throw new Error(`unexpected command ${command}`);
  });
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("missing"));
  await act(() => result.current.create("correct"));
  await act(() => result.current.lock());
  expect(result.current.status).toBe("locked");
  expect(result.current.newSecretKey).toBeNull();
});

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

test("a wrong passphrase is left to the form, and anything else is a toast", async () => {
  let failure = { kind: "wrongPassphrase", message: "wrong passphrase" };
  mockIPC((command) => {
    if (command === "vault_status") return "locked";
    if (command === "unlock_vault") throw failure;
    throw new Error(`unexpected command ${command}`);
  });
  const told = vi.spyOn(toasts, "toastError").mockImplementation(() => {});
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("locked"));
  await act(() => result.current.unlock("wrong"));
  expect(result.current.error?.kind).toBe("wrongPassphrase");
  expect(told).not.toHaveBeenCalled();
  failure = { kind: "keychain", message: "keychain failed" };
  await act(() => result.current.unlock("correct"));
  expect(result.current.error?.kind).toBe("keychain");
  expect(told).toHaveBeenCalledWith("キーチェーンを読み書きできませんでした。");
});

test("a status that cannot be read stays as the error, not a toast, since nothing else is shown", async () => {
  mockIPC(() => {
    throw { kind: "io", message: "file access failed" };
  });
  const told = vi.spyOn(toasts, "toastError").mockImplementation(() => {});
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.error?.kind).toBe("io"));
  expect(result.current.status).toBe("loading");
  expect(told).not.toHaveBeenCalled();
});

test("Touch ID opens the vault; a cancel stays quiet and a lost key is told", async () => {
  let failure: { kind: string; message: string } | null = {
    kind: "biometryCancelled",
    message: "cancelled",
  };
  mockIPC((command) => {
    if (command === "vault_status") return "locked";
    if (command === "unlock_with_biometry") {
      if (failure) throw failure;
      return null;
    }
    throw new Error(`unexpected command ${command}`);
  });
  const told = vi.spyOn(toasts, "toastError").mockImplementation(() => {});
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.status).toBe("locked"));

  await act(() => result.current.unlockWithBiometry("open"));
  expect(result.current.status).toBe("locked");
  expect(told).not.toHaveBeenCalled();

  failure = { kind: "noKeptKey", message: "no key" };
  await act(() => result.current.unlockWithBiometry("open"));
  expect(told).toHaveBeenCalledWith(
    "指紋や顔では開けなくなりました。パスフレーズで開いてください。",
  );

  failure = null;
  await act(() => result.current.unlockWithBiometry("open"));
  expect(result.current.status).toBe("unlocked");
});
