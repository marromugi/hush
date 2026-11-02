import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { writeSettings } from "@/lib/settings/settings";

import { useSettings } from "./useSettings";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test("follows the settings as they are written", () => {
  const { result } = renderHook(() => useSettings());
  expect(result.current.language).toBe("ja");
  act(() => {
    writeSettings({ language: "en" });
  });
  expect(result.current.language).toBe("en");
});
