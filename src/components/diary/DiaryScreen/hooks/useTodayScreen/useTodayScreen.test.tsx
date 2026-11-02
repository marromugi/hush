import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { useSession } from "../../../../../hooks/vault/useSession";
import * as fonts from "../../../../../lib/diary/fonts";
import { UnlockedSession } from "../../../../vault/UnlockedSession";
import { useTodayScreen } from "./useTodayScreen";

afterEach(() => {
  cleanup();
  clearMocks();
  vi.restoreAllMocks();
});

/** A fake Rust side whose saves fail as many times as `failures`. */
function fakeEntries(log: string[], failures = 0) {
  let failuresLeft = failures;
  mockIPC(
    (command, args) => {
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
    },
    { shouldMockEvents: true },
  );
}

/** Today's screen inside an unlocked session whose lock is recorded in `log`. */
async function renderScreen(log: string[]) {
  const hook = renderHook(() => ({ ...useTodayScreen(), lock: useSession().lock }), {
    wrapper: ({ children }) => (
      <UnlockedSession
        onLock={async () => {
          log.push("lock");
        }}
      >
        {children}
      </UnlockedSession>
    ),
  });
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

const klee = {
  id: "klee-one",
  family: "Klee One",
  category: "handwriting",
  stylesheet: "css/klee-one",
};

/** A fake Rust side holding today's entry, whose saves are logged with their font. */
function fakeEntryWithFont(log: string[], saved: { body: string; font: unknown } | null) {
  mockIPC(
    (command, args) => {
      const entry = { date: "2026-11-01", createdAtMs: 1, updatedAtMs: 2 };
      if (command === "read_entry") return saved && { ...entry, ...saved };
      if (command === "save_entry") {
        const body = String(args && "body" in args ? args.body : "");
        const font = args && "font" in args ? args.font : null;
        const id = font && typeof font === "object" && "id" in font ? String(font.id) : "default";
        log.push(`save ${body} in ${id}`);
        return { ...entry, body, font };
      }
      throw new Error(`unexpected command ${command}`);
    },
    { shouldMockEvents: true },
  );
}

test("a picked font is shown and saved at once with what was written", async () => {
  const log: string[] = [];
  fakeEntryWithFont(log, { body: "<p>雪</p>", font: null });
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  const { result } = await renderScreen(log);
  act(() => result.current.pickFont(klee));
  // Well within the typing delay, so this save is the roll's own.
  await waitFor(() => expect(log).toEqual(["save <p>雪</p> in klee-one"]), { timeout: 300 });
  expect(result.current.font).toEqual(klee);
  await waitFor(() => expect(result.current.fontFamily).toBe('"Klee One", cursive'));
});

test("with nothing written, a picked font is saved with the first words", async () => {
  const log: string[] = [];
  fakeEntryWithFont(log, null);
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  const { result } = await renderScreen(log);
  act(() => result.current.pickFont(klee));
  act(() => result.current.onChange("<p>晴れ</p>"));
  await act(() => result.current.lock());
  expect(log).toEqual(["save <p>晴れ</p> in klee-one", "lock"]);
});

test("the font an entry was saved with comes back when it is opened again", async () => {
  const log: string[] = [];
  fakeEntryWithFont(log, { body: "<p>雪</p>", font: klee });
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  const { result } = await renderScreen(log);
  expect(result.current.font).toEqual(klee);
  await waitFor(() => expect(result.current.fontFamily).toBe('"Klee One", cursive'));
  act(() => result.current.onChange("<p>雪の日</p>"));
  await act(() => result.current.lock());
  expect(log).toEqual(["save <p>雪の日</p> in klee-one", "lock"]);
});

test("a font picked after a slow load is saved with what was typed while it loaded", async () => {
  const log: string[] = [];
  fakeEntryWithFont(log, { body: "<p>雪</p>", font: null });
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  const { result } = await renderScreen(log);
  // The dice keeps the handler of the render it was pressed in.
  const pickFromThen = result.current.pickFont;
  act(() => result.current.onChange("<p>雪のあと晴れ</p>"));
  act(() => pickFromThen(klee));
  await waitFor(() => expect(log).toEqual(["save <p>雪のあと晴れ</p> in klee-one"]));
});
