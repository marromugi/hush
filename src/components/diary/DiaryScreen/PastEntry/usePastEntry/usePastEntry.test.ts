import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import * as toasts from "@/lib/ui/toast";

import { usePastEntry } from "./usePastEntry";

afterEach(() => {
  clearMocks();
  vi.restoreAllMocks();
});

test("reads the entry for the date", async () => {
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry" && date === "2022-12-18") {
      return { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2 };
    }
    throw new Error(`unexpected command ${command} ${date}`);
  });
  const { result } = renderHook(() => usePastEntry("2022-12-18"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current).toEqual({
    loading: false,
    body: "<p>雪</p>",
    fontFamily: undefined,
    fontLoading: false,
    failed: false,
  });
});

test("an entry that cannot be opened says why in a toast", async () => {
  mockIPC(() => {
    throw { kind: "brokenEntry", message: "entry file is broken" };
  });
  const told = vi.spyOn(toasts, "toastError").mockImplementation(() => {});
  const { result } = renderHook(() => usePastEntry("2022-12-18"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.failed).toBe(true);
  expect(told).toHaveBeenCalledWith("この日の日記のファイルが壊れているため開けません。");
});
