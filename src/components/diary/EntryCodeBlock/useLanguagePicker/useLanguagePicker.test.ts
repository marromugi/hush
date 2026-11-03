import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";

import { useLanguagePicker } from "./useLanguagePicker";

test("picking a language hands it on and closes the popover; plain text hands on null", () => {
  const changes: (string | null)[] = [];
  const { result } = renderHook(() =>
    useLanguagePicker("typescript", (next) => changes.push(next)),
  );
  act(() => result.current.popover.open());
  act(() => result.current.choose("python"));
  expect(result.current.popover.isOpen).toBe(false);
  act(() => result.current.choose(result.current.options[0]?.value ?? null));
  expect(changes).toEqual(["python", null]);
});

test("clearing the combobox's text changes nothing and keeps the popover open", () => {
  const changes: (string | null)[] = [];
  const { result } = renderHook(() =>
    useLanguagePicker("typescript", (next) => changes.push(next)),
  );
  act(() => result.current.popover.open());
  act(() => result.current.choose(null));
  expect(changes).toEqual([]);
  expect(result.current.popover.isOpen).toBe(true);
});
