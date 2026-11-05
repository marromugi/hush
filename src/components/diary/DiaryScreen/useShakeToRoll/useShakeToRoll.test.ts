import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { useShakeToRoll } from "./useShakeToRoll";

beforeEach(() => {
  mockIPC(() => {}, { shouldMockEvents: true });
});

afterEach(() => {
  cleanup();
  clearMocks();
});

/** Lets the listener be registered, then sends a shake. */
async function shake() {
  await act(async () => {
    await emit("shaken");
  });
}

test("a shake rolls while enabled", async () => {
  const roll = vi.fn<() => void>();
  renderHook(() => useShakeToRoll(roll, true));
  await act(async () => {});
  await shake();
  expect(roll).toHaveBeenCalledTimes(1);
});

test("a shake does nothing while not enabled, and rolls once enabled again", async () => {
  const roll = vi.fn<() => void>();
  const { rerender } = renderHook(({ enabled }) => useShakeToRoll(roll, enabled), {
    initialProps: { enabled: false },
  });
  await act(async () => {});
  await shake();
  expect(roll).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await shake();
  expect(roll).toHaveBeenCalledTimes(1);
});

test("no shake is heard once unmounted", async () => {
  const roll = vi.fn<() => void>();
  const { unmount } = renderHook(() => useShakeToRoll(roll, true));
  await act(async () => {});
  unmount();
  await shake();
  expect(roll).not.toHaveBeenCalled();
});
