import { afterEach, expect, test } from "vitest";

import { readSettings, subscribeSettings, writeSettings } from "./settings";

afterEach(() => {
  localStorage.clear();
});

test("starts from the defaults", () => {
  expect(readSettings()).toEqual({ language: "ja" });
});

test("a written setting is read back, and listeners hear of it", () => {
  let heard = 0;
  const stop = subscribeSettings(() => (heard += 1));
  writeSettings({ language: "en" });
  expect(readSettings()).toEqual({ language: "en" });
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
  expect(readSettings()).toEqual({ language: "ja" });
  localStorage.setItem("hush.settings", JSON.stringify({ language: "fr" }));
  expect(readSettings()).toEqual({ language: "ja" });
});
