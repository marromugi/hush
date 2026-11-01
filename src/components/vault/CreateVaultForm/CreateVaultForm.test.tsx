import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

function submit(passphrase: string, confirm: string) {
  fireEvent.change(screen.getByLabelText("パスフレーズ"), { target: { value: passphrase } });
  fireEvent.change(screen.getByLabelText("もう一度"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: "作る" }));
}

test("two different passphrases do not create and say why", () => {
  const created = renderForm();
  submit("correct horse", "correct hose");
  expect(created).toEqual([]);
  expect(screen.getByRole("alert").textContent).toBe("パスフレーズが一致しません。");
});

test("the same passphrase twice creates with it", () => {
  const created = renderForm();
  submit("correct horse", "correct hose");
  submit("correct horse", "correct horse");
  expect(created).toEqual(["correct horse"]);
  expect(screen.queryByRole("alert")).toBeNull();
});
