import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { LockSection } from "./LockSection";

afterEach(() => {
  cleanup();
  clearMocks();
});

test("choosing Touch ID turns it on, and choosing the passphrase turns it off", async () => {
  const calls: string[] = [];
  mockIPC((command) => {
    calls.push(command);
    if (command === "biometry_status") return { biometry: "touchId", on: false };
    if (command === "turn_on_biometry" || command === "turn_off_biometry") return null;
    throw new Error(`unexpected command ${command}`);
  });
  render(<LockSection />);
  const touchId = await screen.findByLabelText<HTMLInputElement>("Touch ID でも開く");
  const passphrase = screen.getByLabelText<HTMLInputElement>("パスフレーズだけで開く");
  expect(passphrase.checked).toBe(true);

  await act(async () => touchId.click());
  expect(touchId.checked).toBe(true);
  await act(async () => passphrase.click());
  expect(passphrase.checked).toBe(true);
  expect(calls).toEqual(["biometry_status", "turn_on_biometry", "turn_off_biometry"]);
});

test("a device without Touch ID or Face ID offers no choice", async () => {
  mockIPC((command) => {
    if (command === "biometry_status") return { biometry: null, on: false };
    throw new Error(`unexpected command ${command}`);
  });
  render(<LockSection />);
  await screen.findByText(/この端末では、日記帳はパスフレーズで開きます/);
  expect(screen.queryByRole("radio")).toBeNull();
});
