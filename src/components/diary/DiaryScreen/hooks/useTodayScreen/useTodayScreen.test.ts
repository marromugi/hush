import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { useTodayScreen } from "./useTodayScreen";

afterEach(() => {
  clearMocks();
});

/** A fake Rust side whose saves fail as many times as `failures`. */
function fakeEntries(log: string[], failures = 0) {
  let failuresLeft = failures;
  mockIPC((command, args) => {
    if (command === "read_entry") return null;
    if (command === "save_entry") {
      const body = String(args && "body" in args ? args.body : "");
      log.push(`save ${body}`);
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw { kind: "io", message: "file access failed" };
      }
      return { date: "2026-11-01", body, createdAtMs: 1, updatedAtMs: 2 };
    }
    throw new Error(`unexpected command ${command}`);
  });
}

async function renderScreen(log: string[]) {
  const hook = renderHook(() =>
    useTodayScreen(async () => {
      log.push("lock");
    }),
  );
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

test("locking saves what was typed first", async () => {
  const log: string[] = [];
  fakeEntries(log);
  const { result } = await renderScreen(log);
  act(() => result.current.onChange("<p>晴れ</p>"));
  await act(() => result.current.lock());
  expect(log).toEqual(["save <p>晴れ</p>", "lock"]);
});

test("a failed save keeps it unlocked, and locking again tries the save again", async () => {
  const log: string[] = [];
  fakeEntries(log, 1);
  const { result } = await renderScreen(log);
  act(() => result.current.onChange("<p>晴れ</p>"));
  await act(() => result.current.lock());
  expect(log).toEqual(["save <p>晴れ</p>"]);
  expect(result.current.saveMessage).toEqual({
    text: "ファイルの読み書きに失敗しました。",
    failed: true,
  });
  await act(() => result.current.lock());
  expect(log).toEqual(["save <p>晴れ</p>", "save <p>晴れ</p>", "lock"]);
});

test("an editor opened again starts from what was typed, before it is saved", async () => {
  const log: string[] = [];
  fakeEntries(log);
  const { result } = await renderScreen(log);
  act(() => result.current.onChange("<p>晴れ</p>"));
  expect(log).toEqual([]);
  expect(result.current.initialBody).toBe("<p>晴れ</p>");
});
