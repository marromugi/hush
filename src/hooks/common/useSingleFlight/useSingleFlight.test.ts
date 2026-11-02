import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { useSingleFlight } from "./useSingleFlight";

afterEach(() => {
  cleanup();
});

test("a second call while the first runs is turned away, even in the same render", async () => {
  let runs = 0;
  let finish: (() => void) | undefined;
  const { result } = renderHook(() =>
    useSingleFlight(async () => {
      runs += 1;
      // Only the first run waits, until `finish`.
      if (runs > 1) return;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    }),
  );
  const run = result.current.run;
  let first: Promise<void> | undefined;
  act(() => {
    first = run();
    void run();
  });
  expect(runs).toBe(1);
  expect(result.current.running).toBe(true);
  await act(async () => {
    finish?.();
    await first;
  });
  expect(result.current.running).toBe(false);
  await act(() => result.current.run());
  expect(runs).toBe(2);
});

test("a failing action still frees the next call, and the failure reaches the caller", async () => {
  const { result } = renderHook(() =>
    useSingleFlight(async () => {
      throw new Error("offline");
    }),
  );
  await act(async () => {
    await expect(result.current.run()).rejects.toThrow("offline");
  });
  expect(result.current.running).toBe(false);
});
