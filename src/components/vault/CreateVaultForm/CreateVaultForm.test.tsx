import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { CreateVaultForm } from "./CreateVaultForm";

afterEach(() => {
  cleanup();
});

function renderForm() {
  const created: string[] = [];
  render(
    <CreateVaultForm
      busy={false}
      error={null}
      onCreate={async (passphrase) => {
        created.push(passphrase);
      }}
    />,
  );
  return created;
}

/** Submitting is asynchronous; this waits until it has settled. */
async function submit(passphrase: string, confirm: string) {
  fireEvent.change(screen.getByLabelText("パスフレーズ"), { target: { value: passphrase } });
  fireEvent.change(screen.getByLabelText("もう一度"), { target: { value: confirm } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "作る" }));
  });
}

test("two different passphrases do not create and say why", async () => {
  const created = renderForm();
  await submit("correct horse", "correct hose");
  expect(created).toEqual([]);
  expect(screen.getByRole("alert").textContent).toBe("パスフレーズが一致しません。");
});

test("the same passphrase twice creates with it", async () => {
  const created = renderForm();
  await submit("correct horse", "correct hose");
  await submit("correct horse", "correct horse");
  expect(created).toEqual(["correct horse"]);
  expect(screen.queryByRole("alert")).toBeNull();
});
