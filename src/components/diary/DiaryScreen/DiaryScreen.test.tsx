import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, beforeAll, expect, test } from "vitest";

import { DiaryScreen } from "./DiaryScreen";

// The test DOM cancels animations by rejecting a promise nothing awaits; what
// is tested here is what opens and where the focus goes, not the motion.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterEach(() => {
  cleanup();
  clearMocks();
});

const SECRET_KEY = "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A";

function fakeVault() {
  mockIPC(
    (command) => {
      if (command === "read_entry") return null;
      if (command === "list_entry_dates") return [];
      if (command === "show_secret_key") return SECRET_KEY;
      throw new Error(`unexpected command ${command}`);
    },
    { shouldMockEvents: true },
  );
}

test("config opens a menu whose Secret Key item shows the key, and closing returns to config", async () => {
  fakeVault();
  render(<DiaryScreen onLock={async () => {}} />);
  const config = await screen.findByRole("button", { name: "config" });

  fireEvent.click(config);
  fireEvent.click(await screen.findByRole("button", { name: "Secret Key" }));

  const dialog = await screen.findByRole("dialog", { name: "Secret Key" });
  expect(await screen.findByText(SECRET_KEY)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Secret Key" })).toBeNull();

  await act(async () => {
    fireEvent.keyDown(dialog, { key: "Escape" });
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(config));
});

test("ロック in the config menu locks", async () => {
  fakeVault();
  let locks = 0;
  render(
    <DiaryScreen
      onLock={async () => {
        locks += 1;
      }}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "config" }));
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: "ロック" }));
  });
  await waitFor(() => expect(locks).toBe(1));
});
