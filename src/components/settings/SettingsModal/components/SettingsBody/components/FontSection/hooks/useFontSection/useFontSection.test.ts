import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as fonts from "@/lib/diary/fonts";
import { readSettings, writeSettings } from "@/lib/settings/settings";

import { useFontSection } from "./useFontSection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  writeSettings({ language: "ja", defaultFonts: { ja: null, en: null } });
});

const klee = { id: "klee-one", family: "Klee One", category: "handwriting" };
const kana = { id: "kana-only", family: "Kana Only", category: "display" };

/** Fonts that load at once; `kana-only` lacks kanji. */
function fakeFonts() {
  const loaded: string[] = [];
  vi.spyOn(fonts, "listFonts").mockResolvedValue([klee, kana]);
  vi.spyOn(fonts, "fontDetails").mockImplementation(async (id) => ({
    stylesheet: `css/${id}`,
    complete: id !== "kana-only",
  }));
  vi.spyOn(fonts, "loadFont").mockImplementation(async (font) => {
    loaded.push(font.id);
  });
  return loaded;
}

async function renderSection() {
  const hook = renderHook(() => useFontSection());
  await waitFor(() => expect(hook.result.current.fonts).not.toBeNull());
  return hook;
}

test("a chosen font becomes the language's default once it has loaded", async () => {
  const loaded = fakeFonts();
  const { result } = await renderSection();
  await act(() => result.current.choose("klee-one"));
  expect(loaded).toEqual(["klee-one"]);
  expect(readSettings().defaultFonts).toEqual({
    ja: { ...klee, stylesheet: "css/klee-one" },
    en: null,
  });
  expect(result.current.sample).toBe('"Klee One", cursive');
});

test("a font without kanji cannot be chosen, and says why", async () => {
  const loaded = fakeFonts();
  const { result } = await renderSection();
  await act(() => result.current.choose("kana-only"));
  expect(loaded).toEqual([]);
  expect(readSettings().defaultFonts.ja).toBeNull();
  expect(result.current.chooseError).toBe("漢字を持たないフォントは選べません。");
});

test("choosing nothing goes back to the standard font", async () => {
  fakeFonts();
  const { result } = await renderSection();
  await act(() => result.current.choose("klee-one"));
  await act(() => result.current.choose(null));
  expect(readSettings().defaultFonts.ja).toBeNull();
  expect(result.current.sample).toBeUndefined();
});

test("a list that cannot be fetched says so", async () => {
  vi.spyOn(fonts, "listFonts").mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() => useFontSection());
  await waitFor(() =>
    expect(result.current.listError).toBe("フォントの一覧を読み込めませんでした。"),
  );
});

test("a font that cannot load is not kept, and says why", async () => {
  fakeFonts();
  vi.spyOn(fonts, "loadFont").mockRejectedValue(new Error("offline"));
  const { result } = await renderSection();
  await act(() => result.current.choose("klee-one"));
  expect(readSettings().defaultFonts.ja).toBeNull();
  expect(result.current.chooseError).toBe("フォントを読み込めませんでした。");
});

test("the font being chosen shows at once, and a later choice wins over a slow one", async () => {
  fakeFonts();
  let finish: (() => void) | undefined;
  vi.spyOn(fonts, "loadFont").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = await renderSection();
  let slow: Promise<void> | undefined;
  act(() => {
    slow = result.current.choose("klee-one");
  });
  await waitFor(() => expect(result.current.value).toBe("klee-one"));
  expect(result.current.choosing).toBe(true);
  await act(() => result.current.choose(null));
  await act(async () => {
    finish?.();
    await slow;
  });
  expect(readSettings().defaultFonts.ja).toBeNull();
  expect(result.current.value).toBeNull();
});

test("the chosen font's name shows even when the list cannot be fetched", async () => {
  writeSettings({
    defaultFonts: { ja: { ...klee, stylesheet: "css/klee-one" }, en: null },
  });
  vi.spyOn(fonts, "listFonts").mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() => useFontSection());
  await waitFor(() => expect(result.current.listError).not.toBeNull());
  expect(result.current.options).toEqual([{ value: "klee-one", label: "Klee One" }]);
  expect(result.current.value).toBe("klee-one");
});

test("after switching language, the other language's list is not offered", async () => {
  let latin: ((list: fonts.FontChoice[]) => void) | undefined;
  vi.spyOn(fonts, "listFonts").mockImplementation((subset) =>
    subset === "japanese"
      ? Promise.resolve([klee])
      : new Promise((resolve) => {
          latin = resolve;
        }),
  );
  const { result } = await renderSection();
  act(() => {
    writeSettings({ language: "en" });
  });
  expect(result.current.fonts).toBeNull();
  await act(async () => {
    latin?.([{ id: "lora", family: "Lora", category: "serif" }]);
  });
  expect(result.current.fonts).toEqual([{ id: "lora", family: "Lora", category: "serif" }]);
});
