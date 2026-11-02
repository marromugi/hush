import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as fonts from "../../../../../lib/diary/fonts";
import { useFontDice } from "./useFontDice";

afterEach(() => {
  vi.restoreAllMocks();
});

const klee = { id: "klee-one", family: "Klee One", category: "handwriting" };
const noto = { id: "noto-sans-jp", family: "Noto Sans JP", category: "sans-serif" };

/** Fonts that load at once, from a list of `klee` and `noto`. */
function fakeFonts() {
  const loaded: string[] = [];
  const lists = vi.spyOn(fonts, "listFonts").mockResolvedValue([klee, noto]);
  const details: string[] = [];
  vi.spyOn(fonts, "stylesheetUrl").mockImplementation(async (id) => {
    details.push(id);
    return `css/${id}`;
  });
  vi.spyOn(fonts, "loadFont").mockImplementation(async (font) => {
    loaded.push(font.id);
  });
  return { loaded, lists, details };
}

test("a roll shows another font once it has loaded, and the list is fetched once", async () => {
  const { loaded, lists } = fakeFonts();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const { result } = renderHook(() => useFontDice());
  expect(result.current.font).toBeNull();
  await act(() => result.current.roll());
  expect(result.current.font).toEqual(klee);
  await act(() => result.current.roll());
  expect(result.current.font).toEqual(noto);
  expect(loaded).toEqual(["klee-one", "noto-sans-jp"]);
  expect(lists).toHaveBeenCalledTimes(1);
});

test("when the list cannot be fetched, the font stays and the next roll asks again", async () => {
  const { lists } = fakeFonts();
  lists.mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(() => useFontDice());
  await act(() => result.current.roll());
  expect(result.current.font).toBeNull();
  expect(result.current.error).toBe("フォントを読み込めませんでした。");
  await act(() => result.current.roll());
  expect(result.current.font).not.toBeNull();
  expect(result.current.error).toBeNull();
});

test("a font that cannot load is not shown", async () => {
  fakeFonts();
  vi.spyOn(fonts, "loadFont").mockRejectedValue(new Error("stylesheet did not load"));
  const { result } = renderHook(() => useFontDice());
  await act(() => result.current.roll());
  expect(result.current.font).toBeNull();
  expect(result.current.error).toBe("フォントを読み込めませんでした。");
});

test("a font shown before is shown again without asking for its details", async () => {
  const { details } = fakeFonts();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const { result } = renderHook(() => useFontDice());
  await act(() => result.current.roll());
  await act(() => result.current.roll());
  await act(() => result.current.roll());
  expect(result.current.font).toEqual(klee);
  expect(details).toEqual(["klee-one", "noto-sans-jp"]);
});
