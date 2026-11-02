import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { UnlockedSession } from "../../../../vault/UnlockedSession";
import { useDiaryScreen } from "./useDiaryScreen";

/** Renders the hook inside an unlocked session whose lock calls `onLock`. */
function renderDiary(today: string, onLock: () => Promise<void> = async () => {}) {
  return renderHook(() => useDiaryScreen(today), {
    wrapper: ({ children }) => <UnlockedSession onLock={onLock}>{children}</UnlockedSession>,
  });
}

afterEach(() => {
  clearMocks();
  vi.restoreAllMocks();
});

test("lists the written days and today, and shows today first", async () => {
  mockIPC(() => ["2022-12-01", "2022-12-17"], { shouldMockEvents: true });
  const { result } = renderDiary("2022-12-18");
  await waitFor(() => expect(result.current.dates).toHaveLength(3));
  expect(result.current.dates).toEqual(["2022-12-01", "2022-12-17", "2022-12-18"]);
  expect(result.current.selected).toBe("2022-12-18");
  expect(result.current.showsToday).toBe(true);
});

test("today goes in date order, even with a later day written", async () => {
  mockIPC(() => ["2022-12-01", "2022-12-30"], { shouldMockEvents: true });
  const { result } = renderDiary("2022-12-18");
  await waitFor(() => expect(result.current.dates).toHaveLength(3));
  expect(result.current.dates).toEqual(["2022-12-01", "2022-12-18", "2022-12-30"]);
});

test("choosing another day shows that day, read only", async () => {
  mockIPC(() => ["2022-12-01"], { shouldMockEvents: true });
  const { result } = renderDiary("2022-12-18");
  act(() => result.current.select("2022-12-01"));
  expect(result.current.selected).toBe("2022-12-01");
  expect(result.current.selectedParts).toEqual({ year: "2022", month: "12", day: "1" });
  expect(result.current.showsToday).toBe(false);
});

test("choosing a day from the days shown over the diary shows it and puts them away", () => {
  mockIPC(() => ["2022-12-01"], { shouldMockEvents: true });
  const { result } = renderDiary("2022-12-18");
  act(() => result.current.setDatesOpen(true));
  act(() => result.current.selectFromDates("2022-12-01"));
  expect(result.current.selected).toBe("2022-12-01");
  expect(result.current.datesOpen).toBe(false);
});

/** A window whose width can be made to match a media query, as it is resized. */
class FakeScreen extends EventTarget implements MediaQueryList {
  matches = false;
  media = "";
  onchange = null;
  addListener() {}
  removeListener() {}
  widen() {
    this.matches = true;
    this.dispatchEvent(new Event("change"));
  }
}

test("the days shown over the diary are put away once the window is wide enough for the sidebar", () => {
  mockIPC(() => [], { shouldMockEvents: true });
  const screen = new FakeScreen();
  vi.spyOn(window, "matchMedia").mockReturnValue(screen);
  const { result } = renderDiary("2022-12-18");
  act(() => result.current.setDatesOpen(true));
  act(() => screen.widen());
  expect(result.current.datesOpen).toBe(false);
});

test("choosing Secret Key in the config menu closes the menu and shows the Secret Key", () => {
  mockIPC(() => [], { shouldMockEvents: true });
  const { result } = renderDiary("2022-12-18");
  act(() => result.current.setConfigOpen(true));
  act(() => result.current.openSecretKey());
  expect(result.current.configOpen).toBe(false);
  expect(result.current.secretKeyOpen).toBe(true);
});

test("choosing ロック in the config menu closes the menu and locks", async () => {
  mockIPC(() => [], { shouldMockEvents: true });
  let locks = 0;
  const { result } = renderDiary("2022-12-18", async () => {
    locks += 1;
  });
  act(() => result.current.setConfigOpen(true));
  act(() => result.current.lockFromConfig());
  expect(result.current.configOpen).toBe(false);
  await waitFor(() => expect(locks).toBe(1));
});

test("when the days cannot be listed, today is still there and the reason is shown", async () => {
  mockIPC(
    () => {
      throw { kind: "io", message: "file access failed" };
    },
    { shouldMockEvents: true },
  );
  const { result } = renderDiary("2022-12-18");
  await waitFor(() => expect(result.current.datesError).toBe("ファイルの読み書きに失敗しました。"));
  expect(result.current.dates).toEqual(["2022-12-18"]);
});
