import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as fonts from "../../../lib/diary/fonts";
import { writeSettings } from "../../../lib/settings/settings";
import { useEntryFont } from "./useEntryFont";

afterEach(() => {
  cleanup();
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

test("without its own font, an entry is in the current language's default font", async () => {
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  writeSettings({ defaultFonts: { ja: klee, en: null } });
  const { result } = renderHook(() => useEntryFont(null));
  await waitFor(() => expect(result.current.fontFamily).toBe('"Klee One", cursive'));
  act(() => writeSettings({ language: "en" }));
  expect(result.current).toEqual({ fontFamily: undefined, loading: false });
});

test("its own font wins over the default font", async () => {
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  writeSettings({ defaultFonts: { ja: klee, en: null } });
  const { result } = renderHook(() => useEntryFont(zen));
  await waitFor(() =>
    expect(result.current).toEqual({ fontFamily: '"Zen Maru", sans-serif', loading: false }),
  );
});

test("while its own font loads, it is loading in the default font", async () => {
  let finish: (() => void) | undefined;
  vi.spyOn(fonts, "loadFont").mockImplementation(async (font) => {
    if (font.id === "zen-maru") {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    }
  });
  writeSettings({ defaultFonts: { ja: klee, en: null } });
  const { result } = renderHook(() => useEntryFont(zen));
  await waitFor(() =>
    expect(result.current).toEqual({ fontFamily: '"Klee One", cursive', loading: true }),
  );
  await act(async () => finish?.());
  expect(result.current).toEqual({ fontFamily: '"Zen Maru", sans-serif', loading: false });
});

test("when its own font cannot load, it is in the default font", async () => {
  vi.spyOn(fonts, "loadFont").mockImplementation(async (font) => {
    if (font.id === "zen-maru") throw new Error("offline");
  });
  writeSettings({ defaultFonts: { ja: klee, en: null } });
  const { result } = renderHook(() => useEntryFont(zen));
  await waitFor(() =>
    expect(result.current).toEqual({ fontFamily: '"Klee One", cursive', loading: false }),
  );
});
