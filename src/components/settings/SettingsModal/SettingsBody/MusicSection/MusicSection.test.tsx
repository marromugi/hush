import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { readSettings } from "@/lib/settings/settings";

import { MusicSection } from "./MusicSection";

afterEach(() => {
  cleanup();
  clearMocks();
  localStorage.clear();
});

const LISTED = {
  status: "listed",
  playlists: [
    { id: "A1", name: "朝" },
    { id: "B2", name: "夜" },
  ],
};

test("choosing a playlist keeps it with its artwork, and choosing none clears it", async () => {
  mockIPC((command, args) => {
    if (command === "music_playlists") return LISTED;
    if (command === "playlist_artwork" && args && "id" in args && args.id === "B2") {
      return "data:image/jpeg;base64,/9j/";
    }
    throw new Error(`unexpected command ${command}`);
  });
  render(<MusicSection />);
  const night = await screen.findByLabelText<HTMLInputElement>("夜");
  expect(screen.getByLabelText<HTMLInputElement>("流さない").checked).toBe(true);

  await act(async () => night.click());
  expect(readSettings().playlist).toEqual({
    id: "B2",
    name: "夜",
    artwork: "data:image/jpeg;base64,/9j/",
  });
  expect(night.checked).toBe(true);

  await act(async () => screen.getByLabelText("流さない").click());
  expect(readSettings().playlist).toBeNull();
});

test("a playlist whose artwork cannot be read is still kept", async () => {
  mockIPC((command) => {
    if (command === "music_playlists") return LISTED;
    if (command === "playlist_artwork") throw { kind: "tauri", message: "" };
    throw new Error(`unexpected command ${command}`);
  });
  render(<MusicSection />);
  const morning = await screen.findByLabelText("朝");
  await act(async () => morning.click());
  expect(readSettings().playlist).toEqual({ id: "A1", name: "朝", artwork: null });
});

test("without leave to use the Music app, it says so and offers no choice", async () => {
  mockIPC((command) => {
    if (command === "music_playlists") return { status: "denied" };
    throw new Error(`unexpected command ${command}`);
  });
  render(<MusicSection />);
  await screen.findByText(/ミュージックを使う許可がありません/);
  expect(screen.queryByRole("radio")).toBeNull();
});
