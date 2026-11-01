import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import type { EntryView } from "../../../lib/vault/commands";
import { useTodayEntry } from "./useTodayEntry";

afterEach(() => {
  clearMocks();
});

function entry(date: string, body: string): EntryView {
  return { date, body, createdAtMs: 1, updatedAtMs: 2 };
}

/** A fake Rust side holding entries in memory. */
function fakeEntries(initial: Record<string, string>) {
  const entries = new Map(Object.entries(initial));
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry") {
      const body = entries.get(date);
      return body === undefined ? null : entry(date, body);
    }
    if (command === "save_entry") {
      const body = String(args && "body" in args ? args.body : "");
      entries.set(date, body);
      return entry(date, body);
    }
    throw new Error(`unexpected command ${command}`);
  });
}

test("reads the entry for the date", async () => {
  fakeEntries({ "2026-10-29": "<p>晴れ</p>" });
  const { result } = renderHook(() => useTodayEntry("2026-10-29"));
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.entry?.body).toBe("<p>晴れ</p>");
});

test("a day with nothing written has no entry and no error", async () => {
  fakeEntries({});
  const { result } = renderHook(() => useTodayEntry("2026-10-29"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.entry).toBeNull();
  expect(result.current.loadError).toBeNull();
});

test("saving stores the body and shows the saved entry", async () => {
  fakeEntries({});
  const { result } = renderHook(() => useTodayEntry("2026-10-29"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.save("<p>雨</p>"));
  expect(result.current.entry?.body).toBe("<p>雨</p>");
  expect(result.current.saving).toBe(false);
});

test("an entry that cannot be opened is a load error", async () => {
  mockIPC(() => {
    throw { kind: "brokenEntry", message: "entry file is broken" };
  });
  const { result } = renderHook(() => useTodayEntry("2026-10-29"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.loadError?.kind).toBe("brokenEntry");
});

test("a failed save keeps the loaded entry and reports the error", async () => {
  let failSave = false;
  mockIPC((command) => {
    if (command === "read_entry") return entry("2026-10-29", "<p>晴れ</p>");
    if (failSave) throw { kind: "newerEntryVersion", message: "newer" };
    return null;
  });
  const { result } = renderHook(() => useTodayEntry("2026-10-29"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  failSave = true;
  await act(() => result.current.save("<p>雨</p>"));
  expect(result.current.saveError?.kind).toBe("newerEntryVersion");
  expect(result.current.entry?.body).toBe("<p>晴れ</p>");
});

/** Lets every pending promise callback run. */
async function settle() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

test("after the date changes, the previous day's entry is not shown", async () => {
  fakeEntries({ "2026-10-29": "<p>前の日</p>" });
  const { result, rerender } = renderHook(({ date }) => useTodayEntry(date), {
    initialProps: { date: "2026-10-29" },
  });
  await waitFor(() => expect(result.current.entry?.body).toBe("<p>前の日</p>"));
  rerender({ date: "2026-10-30" });
  expect(result.current.loading).toBe(true);
  expect(result.current.entry).toBeNull();
});

test("a reply for an earlier date that arrives late is ignored", async () => {
  const replies = new Map<string, (value: EntryView | null) => void>();
  mockIPC((_command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    return new Promise<EntryView | null>((resolve) => replies.set(date, resolve));
  });
  const { result, rerender } = renderHook(({ date }) => useTodayEntry(date), {
    initialProps: { date: "2026-10-29" },
  });
  await settle();
  rerender({ date: "2026-10-30" });
  await settle();

  replies.get("2026-10-30")?.(entry("2026-10-30", "<p>新しい日</p>"));
  await settle();
  expect(result.current.entry?.body).toBe("<p>新しい日</p>");

  replies.get("2026-10-29")?.(entry("2026-10-29", "<p>前の日</p>"));
  await settle();
  expect(result.current.loading).toBe(false);
  expect(result.current.entry?.body).toBe("<p>新しい日</p>");
});
