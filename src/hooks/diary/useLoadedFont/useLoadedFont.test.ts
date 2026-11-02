import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as fonts from "../../../lib/diary/fonts";
import type { SavedFont } from "../../../lib/diary/fonts";
import { useLoadedFont } from "./useLoadedFont";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const klee = {
  id: "klee-one",
  family: "Klee One",
  category: "handwriting",
  stylesheet: "css/klee",
};
const zen = { id: "zen-maru", family: "Zen Maru", category: "sans-serif", stylesheet: "css/zen" };

/** `loadFont` that waits for `finish(id)` for each font. */
function slowFonts() {
  const waiting = new Map<string, { resolve: () => void; reject: () => void }>();
  vi.spyOn(fonts, "loadFont").mockImplementation(
    (font) =>
      new Promise((resolve, reject) => {
        waiting.set(font.id, { resolve, reject: () => reject(new Error("offline")) });
      }),
  );
  return waiting;
}

test("is loading from when a font is given until it loads, then shows it", async () => {
  const waiting = slowFonts();
  const { result } = renderHook(() => useLoadedFont(klee));
  expect(result.current).toEqual({ fontFamily: undefined, loading: true });
  await act(async () => waiting.get("klee-one")?.resolve());
  expect(result.current).toEqual({ fontFamily: '"Klee One", cursive', loading: false });
});

test("a font that cannot load stops loading and shows nothing", async () => {
  const waiting = slowFonts();
  const { result } = renderHook(() => useLoadedFont(klee));
  await act(async () => waiting.get("klee-one")?.reject());
  expect(result.current).toEqual({ fontFamily: undefined, loading: false });
});

test("without a font, nothing loads", () => {
  const loads = vi.spyOn(fonts, "loadFont");
  const { result } = renderHook(() => useLoadedFont(null));
  expect(result.current).toEqual({ fontFamily: undefined, loading: false });
  expect(loads).not.toHaveBeenCalled();
});

test("a new font keeps the old one shown while it loads", async () => {
  const waiting = slowFonts();
  const { result, rerender } = renderHook(({ font }: { font: SavedFont }) => useLoadedFont(font), {
    initialProps: { font: klee },
  });
  await act(async () => waiting.get("klee-one")?.resolve());
  rerender({ font: zen });
  expect(result.current).toEqual({ fontFamily: '"Klee One", cursive', loading: true });
  await act(async () => waiting.get("zen-maru")?.resolve());
  expect(result.current).toEqual({ fontFamily: '"Zen Maru", sans-serif', loading: false });
});

test("the same font as a new object is not loaded again", async () => {
  const loads = vi.spyOn(fonts, "loadFont").mockResolvedValue();
  const { result, rerender } = renderHook(({ font }: { font: SavedFont }) => useLoadedFont(font), {
    initialProps: { font: klee },
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  rerender({ font: { ...klee } });
  expect(result.current.loading).toBe(false);
  expect(loads).toHaveBeenCalledTimes(1);
});
