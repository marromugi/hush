import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { useDisclosure } from "./useDisclosure";

afterEach(() => {
  cleanup();
});

test("opens and closes, by name or by the next state", () => {
  const { result } = renderHook(() => useDisclosure());
  expect(result.current.isOpen).toBe(false);
  act(() => result.current.open());
  expect(result.current.isOpen).toBe(true);
  act(() => result.current.close());
  expect(result.current.isOpen).toBe(false);
  act(() => result.current.setOpen(true));
  expect(result.current.isOpen).toBe(true);
});
