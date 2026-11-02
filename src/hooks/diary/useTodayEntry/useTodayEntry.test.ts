import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import type { EntryView } from "@/lib/vault/commands";

import { useTodayEntry } from "./useTodayEntry";

afterEach(() => {
  clearMocks();
});

function entry(date: string, body: string): EntryView {
  return { date, body, createdAtMs: 1, updatedAtMs: 2, font: null };
}

/** A fake Rust side holding entries in memory. */
function fakeEntries(initial: Record<string, string>) {
  const entries = new Map(Object.entries(initial));
  const fonts = new Map<string, unknown>();
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry") {
      const body = entries.get(date);
      return body === undefined ? null : { ...entry(date, body), font: fonts.get(date) ?? null };
    }
    if (command === "save_entry") {
      const body = String(args && "body" in args ? args.body : "");
      const font = args && "font" in args ? args.font : null;
      entries.set(date, body);
      fonts.set(date, font);
      return { ...entry(date, body), font };
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

test("saving stores the font with the body", async () => {
  fakeEntries({});
  const { result } = renderHook(() => useTodayEntry("2026-10-29"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  const klee = { id: "klee-one", family: "Klee One", category: "handwriting", stylesheet: "css/k" };
  await act(() => result.current.save("<p>雨</p>", klee));
  expect(result.current.entry?.font).toEqual(klee);
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
  let saved = false;
  await act(async () => {
    saved = await result.current.save("<p>雨</p>", null);
  });
  expect(saved).toBe(true);
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
  await act(() => result.current.save("<p>雨</p>", null));
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

/** A fake Rust side whose saves wait until released, recording their order. */
function heldSaves() {
  const saves: Array<{ date: string; body: string; release: () => void }> = [];
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry") return null;
    const body = String(args && "body" in args ? args.body : "");
    return new Promise<EntryView>((resolve) => {
      saves.push({ date, body, release: () => resolve(entry(date, body)) });
    });
  });
  return saves;
}

test("a save that finishes after the date changes leaves the new day shown", async () => {
  const saves = heldSaves();
  const { result, rerender } = renderHook(({ date }) => useTodayEntry(date), {
    initialProps: { date: "2026-10-29" },
  });
  await waitFor(() => expect(result.current.loading).toBe(false));

  let pending: Promise<boolean> = Promise.resolve(true);
  act(() => {
    pending = result.current.save("<p>夜遅く</p>", null);
  });
  rerender({ date: "2026-10-30" });
  await settle();
  expect(result.current.loading).toBe(false);

  await act(async () => {
    saves[0]?.release();
    await pending;
  });
  expect(saves[0]?.date).toBe("2026-10-29");
  expect(result.current.loading).toBe(false);
  expect(result.current.entry).toBeNull();
});

test("saves run one after another and the last body is shown", async () => {
  const saves = heldSaves();
  const { result } = renderHook(() => useTodayEntry("2026-10-29"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  let first: Promise<boolean> = Promise.resolve(true);
  let second: Promise<boolean> = Promise.resolve(true);
  act(() => {
    first = result.current.save("<p>一</p>", null);
    second = result.current.save("<p>二</p>", null);
  });
  await settle();
  expect(saves.map((save) => save.body)).toEqual(["<p>一</p>"]);

  await act(async () => {
    saves[0]?.release();
    await first;
  });
  await settle();
  expect(result.current.saving).toBe(true);
  expect(saves.map((save) => save.body)).toEqual(["<p>一</p>", "<p>二</p>"]);

  await act(async () => {
    saves[1]?.release();
    await second;
  });
  expect(result.current.saving).toBe(false);
  expect(result.current.entry?.body).toBe("<p>二</p>");
});

test("a save error for one day is not shown on the next", async () => {
  mockIPC((command) => {
    if (command === "read_entry") return null;
    throw { kind: "io", message: "file access failed" };
  });
  const { result, rerender } = renderHook(({ date }) => useTodayEntry(date), {
    initialProps: { date: "2026-10-29" },
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  let saved = true;
  await act(async () => {
    saved = await result.current.save("<p>x</p>", null);
  });
  expect(saved).toBe(false);
  expect(result.current.saveError?.kind).toBe("io");
  rerender({ date: "2026-10-30" });
  expect(result.current.saveError).toBeNull();
});
