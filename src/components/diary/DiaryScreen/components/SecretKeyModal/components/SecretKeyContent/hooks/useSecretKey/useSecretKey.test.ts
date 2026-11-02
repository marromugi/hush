import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as toasts from "@/lib/ui/toast";

import { useSecretKey } from "./useSecretKey";

afterEach(() => {
  clearMocks();
  vi.restoreAllMocks();
});

test("reads the Secret Key", async () => {
  mockIPC((command) => {
    if (command === "show_secret_key") return "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A";
    throw new Error(`unexpected command ${command}`);
  });
  const { result } = renderHook(() => useSecretKey());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.secretKey).toBe("H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A");
});

test("says why in a toast when the keychain has no Secret Key", async () => {
  mockIPC(() => {
    throw { kind: "noSecretKey", message: "this device has no secret key for the vault" };
  });
  const told = vi.spyOn(toasts, "toastError").mockImplementation(() => {});
  const { result } = renderHook(() => useSecretKey());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.secretKey).toBeNull();
  expect(told).toHaveBeenCalledWith("この端末には Secret Key がありません。");
});
