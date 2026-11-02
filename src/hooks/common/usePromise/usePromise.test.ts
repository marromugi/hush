import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { usePromise } from "./usePromise";

afterEach(() => {
  cleanup();
});

/** A promise per key, settled by hand. */
function controlled() {
  const pending = new Map<
    string,
    { resolve: (value: string) => void; reject: (e: Error) => void }
  >();
  const load = (key: string) =>
    new Promise<string>((resolve, reject) => {
      pending.set(key, { resolve, reject });
    });
  return { pending, load };
}

test("is loading until the promise settles, then holds its value or its failure", async () => {
  const { pending, load } = controlled();
  const { result, rerender } = renderHook(({ key }) => usePromise(() => load(key), key), {
    initialProps: { key: "a" },
  });
  expect(result.current).toEqual({ status: "loading" });
  await act(async () => pending.get("a")?.resolve("A"));
  expect(result.current).toEqual({ status: "done", value: "A" });

  rerender({ key: "b" });
  expect(result.current).toEqual({ status: "loading" });
  const failure = new Error("offline");
  await act(async () => pending.get("b")?.reject(failure));
  expect(result.current).toEqual({ status: "failed", error: failure });
});

test("a result for a key no longer asked for is dropped", async () => {
  const { pending, load } = controlled();
  const { result, rerender } = renderHook(({ key }) => usePromise(() => load(key), key), {
    initialProps: { key: "a" },
  });
  rerender({ key: "b" });
  await act(async () => pending.get("a")?.resolve("A"));
  expect(result.current).toEqual({ status: "loading" });
  await act(async () => pending.get("b")?.resolve("B"));
  expect(result.current).toEqual({ status: "done", value: "B" });
});
