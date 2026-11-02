import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as fonts from "../../../../../lib/diary/fonts";
import { PastEntry } from "./PastEntry";

afterEach(() => {
  cleanup();
  clearMocks();
  vi.restoreAllMocks();
});

test("an entry saved without a font is in the default font it is given", async () => {
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry")
      return { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2, font: null };
    throw new Error(`unexpected command ${command}`);
  });
  render(<PastEntry date="2022-12-18" defaultFontFamily='"Klee One", cursive' />);
  await waitFor(() => expect(document.querySelector(".ProseMirror")?.textContent).toBe("雪"));
  expect(document.querySelector<HTMLElement>(".ProseMirror")?.parentElement?.style.fontFamily).toBe(
    '"Klee One", cursive',
  );
});

const zen = { id: "zen-maru", family: "Zen Maru", category: "sans-serif", stylesheet: "css/zen" };

test("an entry saved with a font is in that font, not the default", async () => {
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry")
      return { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2, font: zen };
    throw new Error(`unexpected command ${command}`);
  });
  const loads = vi.spyOn(fonts, "loadFont").mockResolvedValue();
  render(<PastEntry date="2022-12-18" defaultFontFamily='"Klee One", cursive' />);
  await waitFor(() =>
    expect(
      document.querySelector<HTMLElement>(".ProseMirror")?.parentElement?.style.fontFamily,
    ).toBe('"Zen Maru", sans-serif'),
  );
  expect(loads).toHaveBeenCalledWith(zen, "css/zen");
});

test("an entry whose font cannot load is in the default font", async () => {
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry")
      return { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2, font: zen };
    throw new Error(`unexpected command ${command}`);
  });
  const loads = vi.spyOn(fonts, "loadFont").mockRejectedValue(new Error("offline"));
  render(<PastEntry date="2022-12-18" defaultFontFamily='"Klee One", cursive' />);
  await waitFor(() => expect(loads).toHaveBeenCalled());
  await waitFor(() => expect(document.querySelector(".ProseMirror")?.textContent).toBe("雪"));
  expect(document.querySelector<HTMLElement>(".ProseMirror")?.parentElement?.style.fontFamily).toBe(
    '"Klee One", cursive',
  );
});
