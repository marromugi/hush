import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { PastEntry } from "./PastEntry";

afterEach(() => {
  cleanup();
  clearMocks();
});

test("shows the entry in the font it is given", async () => {
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry")
      return { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2 };
    throw new Error(`unexpected command ${command}`);
  });
  render(<PastEntry date="2022-12-18" fontFamily='"Klee One", cursive' />);
  await waitFor(() => expect(document.querySelector(".ProseMirror")?.textContent).toBe("雪"));
  expect(document.querySelector<HTMLElement>(".ProseMirror")?.parentElement?.style.fontFamily).toBe(
    '"Klee One", cursive',
  );
});
