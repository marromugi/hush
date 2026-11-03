import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as fonts from "@/lib/diary/fonts";
import { writeSettings } from "@/lib/settings/settings";

import { PastEntry } from "./PastEntry";

afterEach(() => {
  cleanup();
  clearMocks();
  vi.restoreAllMocks();
  localStorage.clear();
  writeSettings({ language: "ja", defaultFonts: { ja: null, en: null } });
});

const klee = {
  id: "klee-one",
  family: "Klee One",
  category: "handwriting",
  stylesheet: "css/klee",
};
const zen = { id: "zen-maru", family: "Zen Maru", category: "sans-serif", stylesheet: "css/zen" };

/** A day whose entry reads "雪", saved in `font`. */
function fakeEntry(font: unknown) {
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry")
      return { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2, font };
    throw new Error(`unexpected command ${command}`);
  });
}

function shown() {
  const content = document.querySelector<HTMLElement>(".ProseMirror")?.parentElement;
  return { font: content?.style.fontFamily, blurred: content?.classList.contains("blur-sm") };
}

test("an entry saved without a font is in the default font", async () => {
  fakeEntry(null);
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  writeSettings({ defaultFonts: { ja: klee, en: null } });
  render(<PastEntry date="2022-12-18" />);
  await waitFor(() => expect(shown()).toEqual({ font: '"Klee One", cursive', blurred: false }));
});

test("an entry saved with a font is blurred until that font loads, then in it", async () => {
  fakeEntry(zen);
  let finish: (() => void) | undefined;
  const loads = vi.spyOn(fonts, "loadFont").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  writeSettings({ defaultFonts: { ja: null, en: null } });
  render(<PastEntry date="2022-12-18" />);
  await waitFor(() => expect(document.querySelector(".ProseMirror")?.textContent).toBe("雪"));
  expect(shown().blurred).toBe(true);
  await act(async () => {
    finish?.();
  });
  expect(shown()).toEqual({ font: '"Zen Maru", sans-serif', blurred: false });
  expect(loads).toHaveBeenCalledWith(zen, "css/zen");
});

test("an entry whose font cannot load is in the default font, not blurred", async () => {
  fakeEntry(zen);
  vi.spyOn(fonts, "loadFont").mockImplementation(async (font) => {
    if (font.id === "zen-maru") throw new Error("offline");
  });
  writeSettings({ defaultFonts: { ja: klee, en: null } });
  render(<PastEntry date="2022-12-18" />);
  await waitFor(() => expect(shown()).toEqual({ font: '"Klee One", cursive', blurred: false }));
});
