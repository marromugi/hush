import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { NewDeviceUnlockForm } from "./NewDeviceUnlockForm";

afterEach(() => {
  cleanup();
});

test("opens with the typed passphrase and Secret Key", async () => {
  const unlocked: Array<[string, string]> = [];
  render(
    <NewDeviceUnlockForm
      busy={false}
      error={null}
      onUnlock={async (passphrase, secretKey) => {
        unlocked.push([passphrase, secretKey]);
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Secret Key"), { target: { value: "H1-ABCDE" } });
  fireEvent.change(screen.getByLabelText("パスフレーズ"), { target: { value: "correct horse" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
  });
  expect(unlocked).toEqual([["correct horse", "H1-ABCDE"]]);
});
