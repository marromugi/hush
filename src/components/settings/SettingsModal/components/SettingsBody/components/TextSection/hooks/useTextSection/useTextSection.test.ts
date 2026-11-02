import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { readSettings } from "../../../../../../../../../lib/settings/settings";
import { useTextSection } from "./useTextSection";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test("changing one setting keeps the others, and reset puts them all back", () => {
  const { result } = renderHook(() => useTextSection());
  expect(result.current.initial).toBe(true);
  act(() => result.current.change("size", 20));
  act(() => result.current.change("letterSpacing", 0.05));
  expect(readSettings().text).toEqual({ size: 20, lineHeight: 1.6, letterSpacing: 0.05 });
  expect(result.current.initial).toBe(false);
  act(() => result.current.reset());
  expect(readSettings().text).toEqual({ size: 18, lineHeight: 1.6, letterSpacing: 0 });
  expect(result.current.initial).toBe(true);
});
