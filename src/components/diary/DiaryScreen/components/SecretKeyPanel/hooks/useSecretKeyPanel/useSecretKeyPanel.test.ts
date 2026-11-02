import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { useSecretKeyPanel } from "./useSecretKeyPanel";

afterEach(() => {
  clearMocks();
});

test("reads the Secret Key", async () => {
  mockIPC((command) => {
    if (command === "show_secret_key") return "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A";
    throw new Error(`unexpected command ${command}`);
  });
  const { result } = renderHook(() => useSecretKeyPanel());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.secretKey).toBe("H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A");
});

test("says why when the keychain has no Secret Key", async () => {
  mockIPC(() => {
    throw { kind: "noSecretKey", message: "this device has no secret key for the vault" };
  });
  const { result } = renderHook(() => useSecretKeyPanel());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe("この端末には Secret Key がありません。");
});
