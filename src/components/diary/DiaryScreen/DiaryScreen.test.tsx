import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";

import * as fonts from "../../../lib/diary/fonts";
import { writeSettings } from "../../../lib/settings/settings";
import { UnlockedSession } from "../../vault/UnlockedSession";
import { DiaryScreen } from "./DiaryScreen";

// The test DOM cancels animations by rejecting a promise nothing awaits; what
// is tested here is what opens and where the focus goes, not the motion.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterEach(() => {
  cleanup();
  clearMocks();
  vi.restoreAllMocks();
  localStorage.clear();
});

const SECRET_KEY = "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A";

function fakeVault(log: string[] = []) {
  mockIPC(
    (command, args) => {
      if (command === "read_entry") return null;
      if (command === "save_entry") {
        const body = String(args && "body" in args ? args.body : "");
        log.push(`save ${body}`);
        return { date: "2026-11-02", body, createdAtMs: 1, updatedAtMs: 2 };
      }
      if (command === "list_entry_dates") return [];
      if (command === "show_secret_key") return SECRET_KEY;
      throw new Error(`unexpected command ${command}`);
    },
    { shouldMockEvents: true },
  );
}

test("config opens a menu whose Secret Key item shows the key, and closing returns to config", async () => {
  fakeVault();
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  const config = await screen.findByRole("button", { name: "config" });

  fireEvent.click(config);
  fireEvent.click(await screen.findByRole("button", { name: "Secret Key" }));

  const dialog = await screen.findByRole("dialog", { name: "Secret Key" });
  expect(await screen.findByText(SECRET_KEY)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Secret Key" })).toBeNull();

  await act(async () => {
    fireEvent.keyDown(dialog, { key: "Escape" });
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(config));
});

test("ロック in the config menu locks", async () => {
  fakeVault();
  let locks = 0;
  render(
    <UnlockedSession
      onLock={async () => {
        locks += 1;
      }}
    >
      <DiaryScreen />
    </UnlockedSession>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "config" }));
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: "ロック" }));
  });
  await waitFor(() => expect(locks).toBe(1));
});

/** Types into the Tiptap editor on the page, as a person would. */
function type(text: string) {
  const dom = document.querySelector(".ProseMirror");
  if (dom === null || !("editor" in dom) || !(dom.editor instanceof Editor)) {
    throw new Error("no editor on the page");
  }
  dom.editor.commands.insertContent(text);
}

test("a lock the system asks for saves what was just typed first", async () => {
  const log: string[] = [];
  fakeVault(log);
  render(
    <UnlockedSession
      onLock={async () => {
        log.push("lock");
      }}
    >
      <DiaryScreen />
    </UnlockedSession>,
  );
  await waitFor(() => expect(document.querySelector(".ProseMirror")).not.toBeNull());
  act(() => type("晴れ"));
  await act(async () => {
    await emit("lock-requested");
  });
  await waitFor(() => expect(log).toEqual(["save <p>晴れ</p>", "lock"]));
});

test("the dice shows today's entry in the font it picks, and is not there for past days", async () => {
  mockIPC(
    (command) => {
      if (command === "read_entry") return null;
      if (command === "list_entry_dates") return ["2020-01-01"];
      throw new Error(`unexpected command ${command}`);
    },
    { shouldMockEvents: true },
  );
  vi.spyOn(fonts, "listFonts").mockResolvedValue([
    { id: "klee-one", family: "Klee One", category: "handwriting" },
  ]);
  vi.spyOn(fonts, "fontDetails").mockResolvedValue({ stylesheet: "css/klee-one", complete: true });
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  const dice = await screen.findByRole("button", { name: "フォントを変える" });
  await waitFor(() => expect(document.querySelector(".ProseMirror")).not.toBeNull());
  await act(async () => {
    fireEvent.click(dice);
  });
  await waitFor(() =>
    expect(
      document.querySelector<HTMLElement>(".ProseMirror")?.parentElement?.style.fontFamily,
    ).toBe('"Klee One", cursive'),
  );

  // From this month's days back to the years, then 2020, January, the 1st.
  fireEvent.click(screen.getByRole("button", { name: /^\d{4}\.\d{1,2}$/ }));
  fireEvent.click(await screen.findByRole("button", { name: "2020" }));
  fireEvent.click(await screen.findByRole("button", { name: "1" }));
  fireEvent.click(await screen.findByRole("button", { name: "1" }));
  await screen.findByText("この日の日記はありません。");
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "フォントを変える" })).toBeNull(),
  );
});

test("choosing English in the settings makes the dice pick among Latin fonts", async () => {
  fakeVault();
  const lists = vi
    .spyOn(fonts, "listFonts")
    .mockResolvedValue([{ id: "lora", family: "Lora", category: "serif" }]);
  vi.spyOn(fonts, "fontDetails").mockResolvedValue({ stylesheet: "css/lora", complete: true });
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "config" }));
  fireEvent.click(await screen.findByRole("button", { name: "設定" }));
  await screen.findByRole("dialog", { name: "設定" });
  fireEvent.click(screen.getByRole("radio", { name: "English" }));
  expect(screen.getByRole("radio", { name: "English" })).toHaveProperty("checked", true);
  await act(async () => {
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "フォントを変える" }));
  });
  expect(lists).toHaveBeenCalledWith("latin");
});

test("today's entry is in the default font until the dice picks another", async () => {
  fakeVault();
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  writeSettings({
    defaultFonts: {
      ja: { id: "klee-one", family: "Klee One", category: "handwriting", stylesheet: "css/klee" },
      en: null,
    },
  });
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  await waitFor(() =>
    expect(
      document.querySelector<HTMLElement>(".ProseMirror")?.parentElement?.style.fontFamily,
    ).toBe('"Klee One", cursive'),
  );
  vi.spyOn(fonts, "listFonts").mockResolvedValue([
    { id: "zen-maru", family: "Zen Maru", category: "sans-serif" },
  ]);
  vi.spyOn(fonts, "fontDetails").mockResolvedValue({ stylesheet: "css/zen", complete: true });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "フォントを変える" }));
  });
  await waitFor(() =>
    expect(
      document.querySelector<HTMLElement>(".ProseMirror")?.parentElement?.style.fontFamily,
    ).toBe('"Zen Maru", sans-serif'),
  );
  writeSettings({ defaultFonts: { ja: null, en: null } });
});

test("past entries are in the default font too", async () => {
  mockIPC(
    (command, args) => {
      const date = String(args && "date" in args ? args.date : "");
      if (command === "list_entry_dates") return ["2020-01-01"];
      if (command === "read_entry") {
        return date === "2020-01-01"
          ? { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2 }
          : null;
      }
      throw new Error(`unexpected command ${command}`);
    },
    { shouldMockEvents: true },
  );
  vi.spyOn(fonts, "loadFont").mockResolvedValue();
  writeSettings({
    defaultFonts: {
      ja: { id: "klee-one", family: "Klee One", category: "handwriting", stylesheet: "css/klee" },
      en: null,
    },
  });
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  await screen.findByRole("button", { name: "フォントを変える" });
  fireEvent.click(screen.getByRole("button", { name: /^\d{4}\.\d{1,2}$/ }));
  fireEvent.click(await screen.findByRole("button", { name: "2020" }));
  fireEvent.click(await screen.findByRole("button", { name: "1" }));
  fireEvent.click(await screen.findByRole("button", { name: "1" }));
  await waitFor(() => expect(document.querySelector(".ProseMirror")?.textContent).toBe("雪"));
  expect(document.querySelector<HTMLElement>(".ProseMirror")?.parentElement?.style.fontFamily).toBe(
    '"Klee One", cursive',
  );
  writeSettings({ defaultFonts: { ja: null, en: null } });
});
