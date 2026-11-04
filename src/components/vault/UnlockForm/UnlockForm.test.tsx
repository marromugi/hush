import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { UnlockForm } from "./UnlockForm";

afterEach(() => {
  cleanup();
  clearMocks();
});

/** A fake Rust side whose device has Touch ID, turned on or off. */
function fakeBiometry(on: boolean) {
  mockIPC((command) => {
    if (command === "biometry_status") return { biometry: "touchId", on };
    throw new Error(`unexpected command ${command}`);
  });
}

test("opens with the typed passphrase", async () => {
  const unlocked: string[] = [];
  render(
    <UnlockForm
      busy={false}
      error={null}
      onUnlock={async (passphrase) => {
        unlocked.push(passphrase);
      }}
      onUnlockWithBiometry={async () => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("パスフレーズ"), { target: { value: "correct horse" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
  });
  expect(unlocked).toEqual(["correct horse"]);
});

test("with Touch ID on, it asks at once and again from the button", async () => {
  fakeBiometry(true);
  const asked: string[] = [];
  render(
    <UnlockForm
      busy={false}
      error={null}
      onUnlock={async () => {}}
      onUnlockWithBiometry={async (reason) => {
        asked.push(reason);
      }}
    />,
  );
  const button = await screen.findByRole("button", { name: "Touch ID で開く" });
  expect(asked).toHaveLength(1);
  act(() => button.click());
  expect(asked).toHaveLength(2);
});

test("with Touch ID off, it never asks and shows only the passphrase", async () => {
  fakeBiometry(false);
  const asked: string[] = [];
  render(
    <UnlockForm
      busy={false}
      error={null}
      onUnlock={async () => {}}
      onUnlockWithBiometry={async (reason) => {
        asked.push(reason);
      }}
    />,
  );
  await act(async () => {});
  expect(screen.queryByRole("button", { name: "Touch ID で開く" })).toBeNull();
  expect(asked).toEqual([]);
});
