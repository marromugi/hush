import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";

import { useSidebar } from "./useSidebar";

const dates = ["2021-03-05", "2022-04-13", "2022-12-01", "2022-12-18"];

test("starts on the days of the selected month, with the selected day marked", () => {
  const { result } = renderHook(() => useSidebar(dates, "2022-12-18"));
  expect(result.current.shownMonth?.title).toBe("2022.12");
  expect(result.current.shownMonth?.days).toEqual([
    { date: "2022-12-01", label: "1", selected: false },
    { date: "2022-12-18", label: "18", selected: true },
  ]);
});

test("going back lists the years, with only the selected year open", () => {
  const { result } = renderHook(() => useSidebar(dates, "2022-12-18"));
  act(() => result.current.back());
  expect(result.current.shownMonth).toBeNull();
  expect(result.current.years.map(({ year, open }) => [year, open])).toEqual([
    ["2022", true],
    ["2021", false],
  ]);
});

test("a year opens and closes, and choosing a month lists its days", () => {
  const { result } = renderHook(() => useSidebar(dates, "2022-12-18"));
  act(() => result.current.back());
  act(() => result.current.toggleYear("2021"));
  act(() => result.current.toggleYear("2022"));
  expect(result.current.years.map(({ year, open }) => [year, open])).toEqual([
    ["2022", false],
    ["2021", true],
  ]);
  act(() => result.current.showMonth("2021-03"));
  expect(result.current.shownMonth?.days).toEqual([
    { date: "2021-03-05", label: "5", selected: false },
  ]);
});
