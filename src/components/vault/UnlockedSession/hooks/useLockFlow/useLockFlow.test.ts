import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";

import { useLockFlow } from "./useLockFlow";

test("finishes all registered work, then locks", async () => {
  const log: string[] = [];
  const { result } = renderHook(() =>
    useLockFlow(async () => {
      log.push("lock");
    }),
  );
  act(() => {
    result.current.addBeforeLock(async () => {
      log.push("save today");
      return true;
    });
    result.current.addBeforeLock(async () => {
      log.push("save draft");
      return true;
    });
  });
  await act(() => result.current.lock());
  expect(log).toEqual(["save today", "save draft", "lock"]);
});

test("does not lock when any work fails, and runs it again on the next lock", async () => {
  const log: string[] = [];
  let failures = 1;
  const { result } = renderHook(() =>
    useLockFlow(async () => {
      log.push("lock");
    }),
  );
  act(() => {
    result.current.addBeforeLock(async () => {
      log.push("save");
      failures -= 1;
      return failures < 0;
    });
  });
  await act(() => result.current.lock());
  expect(log).toEqual(["save"]);
  await act(() => result.current.lock());
  expect(log).toEqual(["save", "save", "lock"]);
});

test("work removed before locking is not run", async () => {
  const log: string[] = [];
  const { result } = renderHook(() =>
    useLockFlow(async () => {
      log.push("lock");
    }),
  );
  act(() => {
    const remove = result.current.addBeforeLock(async () => {
      log.push("save");
      return true;
    });
    remove();
  });
  await act(() => result.current.lock());
  expect(log).toEqual(["lock"]);
});

test("a lock asked for while one runs joins it, and stays locking until it ends", async () => {
  const log: string[] = [];
  let finish: (() => void) | undefined;
  const { result } = renderHook(() =>
    useLockFlow(
      () =>
        new Promise<void>((resolve) => {
          log.push("lock");
          finish = resolve;
        }),
    ),
  );
  let first: Promise<void> | undefined;
  let second: Promise<void> | undefined;
  await act(async () => {
    first = result.current.lock();
    second = result.current.lock();
    await Promise.resolve();
  });
  expect(log).toEqual(["lock"]);
  expect(result.current.locking).toBe(true);
  await act(async () => {
    finish?.();
    await Promise.all([first, second]);
  });
  expect(result.current.locking).toBe(false);
});
