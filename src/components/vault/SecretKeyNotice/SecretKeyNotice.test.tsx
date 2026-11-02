import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { UnlockedSession } from "@/components/vault/UnlockedSession";

import { SecretKeyNotice } from "./SecretKeyNotice";

afterEach(() => {
  cleanup();
  clearMocks();
});

test("the diary cannot be opened while a lock runs", async () => {
  mockIPC(() => null, { shouldMockEvents: true });
  render(
    <UnlockedSession onLock={() => new Promise(() => {})}>
      <SecretKeyNotice secretKey="H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A" onKept={() => {}} />
    </UnlockedSession>,
  );
  const kept = screen.getByRole("button", { name: "控えました" });
  expect(kept.hasAttribute("disabled")).toBe(false);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await emit("lock-requested");
  });
  expect(kept.hasAttribute("disabled")).toBe(true);
});
