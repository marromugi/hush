import { afterEach, expect, test, vi } from "vitest";

import { readSettings, subscribeSettings, writeSettings } from "./settings";

const DEFAULTS = {
  language: "ja",
  defaultFonts: { ja: null, en: null },
  text: { size: 18, lineHeight: 1.6, letterSpacing: 0 },
};

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

test("starts from the defaults", () => {
  expect(readSettings()).toEqual(DEFAULTS);
});

test("a written setting is read back, and listeners hear of it", () => {
  let heard = 0;
  const stop = subscribeSettings(() => (heard += 1));
  writeSettings({ language: "en" });
  expect(readSettings()).toEqual({ ...DEFAULTS, language: "en" });
  expect(heard).toBe(1);
  stop();
  writeSettings({ language: "ja" });
  expect(heard).toBe(1);
});

test("the same settings are the same object until they change", () => {
  const first = readSettings();
  expect(readSettings()).toBe(first);
  writeSettings({ language: "en" });
  expect(readSettings()).not.toBe(first);
});

test("stored text that is broken, or a value not understood, reads as the default", () => {
  localStorage.setItem("hush.settings", "{not json");
  expect(readSettings()).toEqual(DEFAULTS);
  localStorage.setItem("hush.settings", JSON.stringify({ language: "fr" }));
  expect(readSettings()).toEqual(DEFAULTS);
});

test("when storage refuses, a written setting lasts until the app closes", () => {
  const refuse = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new DOMException("full", "QuotaExceededError");
  });
  let heard = 0;
  const stop = subscribeSettings(() => (heard += 1));
  try {
    writeSettings({ language: "en" });
    expect(readSettings()).toEqual({ ...DEFAULTS, language: "en" });
    expect(heard).toBe(1);
  } finally {
    stop();
    refuse.mockRestore();
  }
});

test("a default font is kept per language, and one stored broken reads as none", () => {
  const klee = {
    id: "klee-one",
    family: "Klee One",
    category: "handwriting",
    stylesheet: "https://cdn.example/klee.css",
  };
  writeSettings({ defaultFonts: { ja: klee, en: null } });
  expect(readSettings().defaultFonts).toEqual({ ja: klee, en: null });
  localStorage.setItem("hush.settings", JSON.stringify({ defaultFonts: { ja: { id: 1 } } }));
  expect(readSettings().defaultFonts).toEqual({ ja: null, en: null });
});

test("the text settings are kept, and a value out of range or not a number reads as its default", () => {
  writeSettings({ text: { size: 20, lineHeight: 1.8, letterSpacing: 0.05 } });
  expect(readSettings().text).toEqual({ size: 20, lineHeight: 1.8, letterSpacing: 0.05 });
  localStorage.setItem(
    "hush.settings",
    JSON.stringify({ text: { size: 99, lineHeight: "loose", letterSpacing: 0.1 } }),
  );
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.6, letterSpacing: 0.1 });
});
