import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { useDiaryScreen } from "./useDiaryScreen";

afterEach(() => {
  clearMocks();
});

test("lists the written days and today, and shows today first", async () => {
  mockIPC(() => ["2022-12-01", "2022-12-17"]);
  const { result } = renderHook(() => useDiaryScreen("2022-12-18"));
  await waitFor(() => expect(result.current.dates).toHaveLength(3));
  expect(result.current.dates).toEqual(["2022-12-01", "2022-12-17", "2022-12-18"]);
  expect(result.current.selected).toBe("2022-12-18");
  expect(result.current.showsToday).toBe(true);
});

test("today goes in date order, even with a later day written", async () => {
  mockIPC(() => ["2022-12-01", "2022-12-30"]);
  const { result } = renderHook(() => useDiaryScreen("2022-12-18"));
  await waitFor(() => expect(result.current.dates).toHaveLength(3));
  expect(result.current.dates).toEqual(["2022-12-01", "2022-12-18", "2022-12-30"]);
});

test("choosing another day shows that day, read only", async () => {
  mockIPC(() => ["2022-12-01"]);
  const { result } = renderHook(() => useDiaryScreen("2022-12-18"));
  act(() => result.current.select("2022-12-01"));
  expect(result.current.selectedParts).toEqual({ year: "2022", month: "12", day: "1" });
  expect(result.current.showsToday).toBe(false);
});

test("the Secret Key shows in place of the day, and choosing a day closes it", async () => {
  mockIPC(() => ["2022-12-01"]);
  const { result } = renderHook(() => useDiaryScreen("2022-12-18"));
  act(() => result.current.openSecretKey());
  expect(result.current.showsSecretKey).toBe(true);
  act(() => result.current.select("2022-12-01"));
  expect(result.current.showsSecretKey).toBe(false);
  expect(result.current.selected).toBe("2022-12-01");
});

test("when the days cannot be listed, today is still there and the reason is shown", async () => {
  mockIPC(() => {
    throw { kind: "io", message: "file access failed" };
  });
  const { result } = renderHook(() => useDiaryScreen("2022-12-18"));
  await waitFor(() => expect(result.current.datesError).toBe("ファイルの読み書きに失敗しました。"));
  expect(result.current.dates).toEqual(["2022-12-18"]);
});
