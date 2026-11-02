import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { UnlockForm } from "./UnlockForm";

afterEach(() => {
  cleanup();
});

test("opens with the typed passphrase", async () => {
  const unlocked: string[] = [];
  render(
    <UnlockForm
      busy={false}
      error={null}
      onUnlock={async (passphrase) => {
        unlocked.push(passphrase);
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("パスフレーズ"), { target: { value: "correct horse" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
  });
  expect(unlocked).toEqual(["correct horse"]);
});
