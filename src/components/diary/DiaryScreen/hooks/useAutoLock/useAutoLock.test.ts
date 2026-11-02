import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

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
