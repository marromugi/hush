import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { HushError } from "@/lib/vault/hushError";

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

test("a passphrase or Secret Key that does not open the vault is said in the form", () => {
  render(
    <NewDeviceUnlockForm
      busy={false}
      error={new HushError("wrongPassphraseOrSecretKey", "wrong passphrase or secret key")}
      onUnlock={async () => {}}
    />,
  );
  expect(screen.getByRole("alert").textContent).toBe("パスフレーズか Secret Key が違います。");
});
