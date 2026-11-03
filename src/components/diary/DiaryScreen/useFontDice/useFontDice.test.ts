import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";

import * as fonts from "@/lib/diary/fonts";
import type { SavedFont } from "@/lib/diary/fonts";
import * as toasts from "@/lib/ui/toast";

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
  vi.spyOn(fonts, "fontDetails").mockImplementation(async (id) => {
    details.push(id);
    return { stylesheet: `css/${id}`, complete: id !== "kana-only" };
  });
  vi.spyOn(fonts, "loadFont").mockImplementation(async (font) => {
    loaded.push(font.id);
  });
  return { loaded, lists, details };
}

/** The dice, with the font it picks kept as the caller would keep it. */
function renderDice(initialSubset = "japanese") {
  return renderHook(
    ({ subset }) => {
      const [font, setFont] = useState<SavedFont | null>(null);
      return { font, ...useFontDice(subset, font, setFont) };
    },
    { initialProps: { subset: initialSubset } },
  );
}

test("a roll shows another font once it has loaded, and the list is fetched once", async () => {
  const { loaded, lists } = fakeFonts();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const { result } = renderDice();
  expect(result.current.font).toBeNull();
  await act(() => result.current.roll());
  expect(result.current.font).toEqual({ ...klee, stylesheet: "css/klee-one" });
  await act(() => result.current.roll());
  expect(result.current.font).toMatchObject(noto);
  expect(loaded).toEqual(["klee-one", "noto-sans-jp"]);
  expect(lists).toHaveBeenCalledTimes(1);
});

test("when the list cannot be fetched, the font stays and the next roll asks again", async () => {
  const { lists } = fakeFonts();
  const told = vi.spyOn(toasts, "toastError").mockImplementation(() => {});
  lists.mockRejectedValueOnce(new Error("offline"));
  const { result } = renderDice();
  await act(() => result.current.roll());
  expect(result.current.font).toBeNull();
  expect(told).toHaveBeenCalledWith("フォントを読み込めませんでした。");
  await act(() => result.current.roll());
  expect(result.current.font).not.toBeNull();
  expect(told).toHaveBeenCalledTimes(1);
});

test("a font that cannot load is not shown", async () => {
  fakeFonts();
  const told = vi.spyOn(toasts, "toastError").mockImplementation(() => {});
  vi.spyOn(fonts, "loadFont").mockRejectedValue(new Error("stylesheet did not load"));
  const { result } = renderDice();
  await act(() => result.current.roll());
  expect(result.current.font).toBeNull();
  expect(told).toHaveBeenCalledWith("フォントを読み込めませんでした。");
});

test("a font shown before is shown again without asking for its details", async () => {
  const { details } = fakeFonts();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const { result } = renderDice();
  await act(() => result.current.roll());
  await act(() => result.current.roll());
  await act(() => result.current.roll());
  expect(result.current.font).toMatchObject(klee);
  expect(details).toEqual(["klee-one", "noto-sans-jp"]);
});

test("a font lacking characters is never shown, and is not picked again", async () => {
  const kana = { id: "kana-only", family: "Kana Only", category: "display" };
  const { loaded, details } = fakeFonts();
  vi.spyOn(fonts, "listFonts").mockResolvedValue([kana, klee]);
  vi.spyOn(Math, "random").mockReturnValue(0);
  const { result } = renderDice();
  await act(() => result.current.roll());
  expect(result.current.font).toMatchObject(klee);
  await act(() => result.current.roll());
  expect(result.current.font).toMatchObject(klee);
  expect(loaded).toEqual(["klee-one"]);
  expect(details).toEqual(["kana-only", "klee-one"]);
});

test("each subset has its own font list", async () => {
  const { lists } = fakeFonts();
  const { result, rerender } = renderDice();
  await act(() => result.current.roll());
  rerender({ subset: "latin" });
  await act(() => result.current.roll());
  await act(() => result.current.roll());
  expect(lists.mock.calls).toEqual([["japanese"], ["latin"]]);
});

test("a font lacking one language's characters can still be picked for another", async () => {
  const { loaded } = fakeFonts();
  const kana = { id: "kana-only", family: "Kana Only", category: "display" };
  vi.spyOn(fonts, "listFonts").mockResolvedValue([kana]);
  vi.spyOn(fonts, "fontDetails").mockImplementation(async (id, subset) => ({
    stylesheet: `css/${id}`,
    complete: subset !== "japanese",
  }));
  const { result, rerender } = renderDice();
  await act(() => result.current.roll());
  expect(result.current.font).toBeNull();
  rerender({ subset: "latin" });
  await act(() => result.current.roll());
  expect(result.current.font).toMatchObject(kana);
  expect(loaded).toEqual(["kana-only"]);
});

test("two presses before the first roll is done roll once", async () => {
  const { loaded } = fakeFonts();
  const { result } = renderDice();
  const roll = result.current.roll;
  await act(async () => {
    const first = roll();
    void roll();
    await first;
  });
  expect(loaded).toHaveLength(1);
});
