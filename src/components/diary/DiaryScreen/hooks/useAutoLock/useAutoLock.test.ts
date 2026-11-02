import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { useAutoLock } from "./useAutoLock";

afterEach(() => {
  clearMocks();
});

test("locks when the system asks", async () => {
  mockIPC(() => null, { shouldMockEvents: true });
  let locks = 0;
  renderHook(() =>
    useAutoLock(async () => {
      locks += 1;
    }),
  );
  await waitFor(async () => {
    await emit("lock-requested");
    expect(locks).toBe(1);
  });
});

test("stops listening once the diary is gone", async () => {
  mockIPC(() => null, { shouldMockEvents: true });
  let locks = 0;
  const { unmount } = renderHook(() =>
    useAutoLock(async () => {
      locks += 1;
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  unmount();
  await emit("lock-requested");
  expect(locks).toBe(0);
});

test("a lock asked for before listening starts, after the diary is gone, does nothing", async () => {
  mockIPC(() => null, { shouldMockEvents: true });
  let locks = 0;
  const { unmount } = renderHook(() =>
    useAutoLock(async () => {
      locks += 1;
    }),
  );
  unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await emit("lock-requested");
  expect(locks).toBe(0);
});

test("locks after five minutes with nothing happening in the window", () => {
  vi.useFakeTimers();
  try {
    mockIPC(() => null, { shouldMockEvents: true });
    let locks = 0;
    renderHook(() =>
      useAutoLock(async () => {
        locks += 1;
      }),
    );
    vi.advanceTimersByTime(4 * 60 * 1000);
    window.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(locks).toBe(0);
    vi.advanceTimersByTime(1);
    expect(locks).toBe(1);
  } finally {
    vi.useRealTimers();
  }
});
