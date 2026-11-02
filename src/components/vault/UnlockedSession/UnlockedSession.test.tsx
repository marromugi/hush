import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { UnlockedSession } from "./UnlockedSession";

afterEach(() => {
  cleanup();
  clearMocks();
});

test("any screen inside it locks when the system asks", async () => {
  mockIPC(() => null, { shouldMockEvents: true });
  let locks = 0;
  render(
    <UnlockedSession
      onLock={async () => {
        locks += 1;
      }}
    >
      <p>どの画面でも</p>
    </UnlockedSession>,
  );
  await waitFor(async () => {
    await emit("lock-requested");
    expect(locks).toBe(1);
  });
});
