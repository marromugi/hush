import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as fonts from "../../../../../lib/diary/fonts";
import { writeSettings } from "../../../../../lib/settings/settings";
import { useDefaultFont } from "./useDefaultFont";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  writeSettings({ language: "ja", defaultFonts: { ja: null, en: null } });
});

const klee = {
  id: "klee-one",
  family: "Klee One",
  category: "handwriting",
  stylesheet: "https://cdn.example/klee.css",
};

test("shows the language's default font once it has loaded, and the standard font before", async () => {
  let finish: (() => void) | undefined;
  const loads = vi.spyOn(fonts, "loadFont").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  writeSettings({ defaultFonts: { ja: klee, en: null } });
  const { result } = renderHook(() => useDefaultFont());
  expect(result.current).toBeUndefined();
  await act(async () => {
    finish?.();
  });
  expect(result.current).toBe('"Klee One", cursive');
  expect(loads).toHaveBeenCalledWith(klee, "https://cdn.example/klee.css");
  act(() => {
    writeSettings({ language: "en" });
  });
  expect(result.current).toBeUndefined();
});

test("a default font that cannot load leaves the standard font", async () => {
  const loads = vi.spyOn(fonts, "loadFont").mockRejectedValue(new Error("offline"));
  writeSettings({ defaultFonts: { ja: klee, en: null } });
  const { result } = renderHook(() => useDefaultFont());
  await waitFor(() => expect(loads).toHaveBeenCalled());
  expect(result.current).toBeUndefined();
});
