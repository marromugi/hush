import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { PlaylistButton } from "./PlaylistButton";

afterEach(() => {
  cleanup();
  clearMocks();
});

const NIGHT = { id: "B2", name: "夜", artwork: null };

test("pressing it plays the playlist by this device's id", async () => {
  const played: unknown[] = [];
  mockIPC((command, args) => {
    if (command === "play_playlist") {
      played.push(args);
      return null;
    }
    throw new Error(`unexpected command ${command}`);
  });
  render(<PlaylistButton playlist={NIGHT} />);
  await act(async () => screen.getByRole("button", { name: "「夜」を流す" }).click());
  expect(played).toEqual([{ id: "B2" }]);
});

test("a second press waits until the Music app has started", async () => {
  let started: (() => void) | undefined;
  let presses = 0;
  mockIPC((command) => {
    if (command !== "play_playlist") throw new Error(`unexpected command ${command}`);
    presses += 1;
    return new Promise<null>((resolve) => (started = () => resolve(null)));
  });
  render(<PlaylistButton playlist={NIGHT} />);
  const button = screen.getByRole<HTMLButtonElement>("button");
  await act(async () => button.click());
  expect(button.disabled).toBe(true);
  await act(async () => button.click());
  expect(presses).toBe(1);
  await act(async () => started?.());
  expect(button.disabled).toBe(false);
});
