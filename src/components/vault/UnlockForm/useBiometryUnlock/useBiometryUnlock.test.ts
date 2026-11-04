import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { useBiometryUnlock } from "./useBiometryUnlock";

afterEach(() => {
  clearMocks();
  vi.restoreAllMocks();
});

function setVisibility(state: DocumentVisibilityState) {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);
  document.dispatchEvent(new Event("visibilitychange"));
}

test("locked in the background, it asks once the app is in front again", async () => {
  mockIPC((command) => {
    if (command === "biometry_status") return { biometry: "faceId", on: true };
    throw new Error(`unexpected command ${command}`);
  });
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  let asked = 0;
  const { result, unmount } = renderHook(() =>
    useBiometryUnlock(async () => {
      asked += 1;
    }),
  );
  await waitFor(() => expect(result.current.biometry).toBe("faceId"));
  expect(asked).toBe(0);

  act(() => setVisibility("visible"));
  expect(asked).toBe(1);

  unmount();
  act(() => setVisibility("visible"));
  expect(asked).toBe(1);
});
