import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";

import { useNewDeviceUnlockForm } from "./useNewDeviceUnlockForm";

test("a QR code read fills the Secret Key and closes the camera", async () => {
  const unlocked: Array<[string, string]> = [];
  const { result } = renderHook(() =>
    useNewDeviceUnlockForm(async (passphrase, secretKey) => {
      unlocked.push([passphrase, secretKey]);
    }),
  );
  act(() => {
    result.current.startScan();
  });
  expect(result.current.scanning).toBe(true);
  act(() => {
    result.current.onScanned("H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A");
  });
  expect(result.current.scanning).toBe(false);
  await act(async () => {
    result.current.handleSubmit();
  });
  expect(unlocked).toEqual([["", "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A"]]);
});
