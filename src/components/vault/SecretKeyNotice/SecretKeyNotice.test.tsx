import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { SecretKeyNotice } from "./SecretKeyNotice";

afterEach(() => {
  cleanup();
  clearMocks();
});

test("locks when the system asks, while the Secret Key is on screen", async () => {
  mockIPC(() => null, { shouldMockEvents: true });
  let locks = 0;
  render(
    <SecretKeyNotice
      secretKey="H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A"
      onKept={() => {}}
      onLock={async () => {
        locks += 1;
      }}
    />,
  );
  await waitFor(async () => {
    await emit("lock-requested");
    expect(locks).toBe(1);
  });
});
