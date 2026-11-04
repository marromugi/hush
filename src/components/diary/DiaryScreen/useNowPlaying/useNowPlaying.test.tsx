import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { useNowPlaying } from "./useNowPlaying";

afterEach(() => {
  cleanup();
  clearMocks();
});

const SONG = { title: "Song", artist: "Artist", artwork: "data:image/png;base64,iVBORw==" };

test("starts with what plays, and follows the Music app as it changes", async () => {
  mockIPC((command) => (command === "now_playing" ? SONG : null), { shouldMockEvents: true });
  const { result } = renderHook(() => useNowPlaying());
  await waitFor(() => expect(result.current).toEqual(SONG));

  await act(async () => {
    await emit("now-playing-changed", null);
  });
  expect(result.current).toBeNull();

  const next = { ...SONG, title: "Next" };
  await act(async () => {
    await emit("now-playing-changed", next);
  });
  expect(result.current).toEqual(next);
});

test("a change that comes while the first question is still out wins over its answer", async () => {
  let answer: ((song: typeof SONG) => void) | undefined;
  mockIPC(
    (command) => (command === "now_playing" ? new Promise((resolve) => (answer = resolve)) : null),
    { shouldMockEvents: true },
  );
  const { result } = renderHook(() => useNowPlaying());
  const next = { ...SONG, title: "Next" };
  await waitFor(async () => {
    await act(async () => {
      await emit("now-playing-changed", next);
    });
    expect(result.current).toEqual(next);
  });
  await act(async () => answer?.(SONG));
  expect(result.current).toEqual(next);
});
