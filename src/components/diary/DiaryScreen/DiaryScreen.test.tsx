import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

/**
 * Opens 2020-01-01 from the days in `scope`: back to the years, then 2020,
 * January, the 1st. January is looked for inside 2020, since today's year
 * is open too and has a January of its own.
 */
async function openNewYear2020(scope: ReturnType<typeof within>) {
  fireEvent.click(scope.getByRole("button", { name: /^\d{4}\.\d{1,2}$/ }));
  const year = await scope.findByRole("button", { name: "2020" });
  fireEvent.click(year);
  const months = year.closest("li");
  if (months === null) throw new Error("2020 is not in a list");
  fireEvent.click(await within(months).findByRole("button", { name: "1" }));
  await act(async () => {
    fireEvent.click(await scope.findByRole("button", { name: "1" }));
  });
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

  await openNewYear2020(within(document.body));
  await screen.findByText("この日の日記はありません。");
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "フォントを変える" })).toBeNull(),
  );
});

test("the dice cannot be pressed until today's entry has been read", async () => {
  mockIPC(
    (command) => {
      if (command === "read_entry") return new Promise(() => {});
      if (command === "list_entry_dates") return [];
      throw new Error(`unexpected command ${command}`);
    },
    { shouldMockEvents: true },
  );
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  const dice = await screen.findByRole("button", { name: "フォントを変える" });
  expect(dice).toHaveProperty("disabled", true);
});

test("the dice's font is saved with today's entry", async () => {
  const fontsSent: unknown[] = [];
  mockIPC(
    (command, args) => {
      if (command === "read_entry") {
        return {
          date: "2026-11-02",
          body: "<p>晴れ</p>",
          createdAtMs: 1,
          updatedAtMs: 2,
          font: null,
        };
      }
      if (command === "save_entry") {
        const font = args && "font" in args ? args.font : null;
        fontsSent.push(font);
        return { date: "2026-11-02", body: "<p>晴れ</p>", createdAtMs: 1, updatedAtMs: 3, font };
      }
      if (command === "list_entry_dates") return [];
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
  await waitFor(() => expect(document.querySelector(".ProseMirror")).not.toBeNull());
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "フォントを変える" }));
  });
  await waitFor(() =>
    expect(fontsSent).toEqual([
      { id: "klee-one", family: "Klee One", category: "handwriting", stylesheet: "css/klee-one" },
    ]),
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
          ? { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2, font: null }
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
  await openNewYear2020(within(document.body));
  await waitFor(() => expect(document.querySelector(".ProseMirror")?.textContent).toBe("雪"));
  expect(document.querySelector<HTMLElement>(".ProseMirror")?.parentElement?.style.fontFamily).toBe(
    '"Klee One", cursive',
  );
  writeSettings({ defaultFonts: { ja: null, en: null } });
});

/** What holds the editor's text, where its font and blur are set. */
function content() {
  return document.querySelector(".ProseMirror")?.parentElement;
}

test("today's entry is blurred while the dice loads a font, and clear once it has", async () => {
  fakeVault();
  vi.spyOn(fonts, "listFonts").mockResolvedValue([
    { id: "klee-one", family: "Klee One", category: "handwriting" },
  ]);
  vi.spyOn(fonts, "fontDetails").mockResolvedValue({ stylesheet: "css/klee-one", complete: true });
  // Every load of the font waits until the font arrives.
  let arrive: (() => void) | undefined;
  const arrived = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  vi.spyOn(fonts, "loadFont").mockReturnValue(arrived);
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  await waitFor(() => expect(document.querySelector(".ProseMirror")).not.toBeNull());
  expect(content()?.classList.contains("blur-sm")).toBe(false);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "フォントを変える" }));
  });
  await waitFor(() => expect(content()?.classList.contains("blur-sm")).toBe(true));
  await act(async () => {
    arrive?.();
  });
  await waitFor(() => expect(content()?.classList.contains("blur-sm")).toBe(false));
  expect(content()?.style.fontFamily).toBe('"Klee One", cursive');
});

test("the header's button shows the days over the diary, and choosing one opens it", async () => {
  mockIPC(
    (command, args) => {
      const date = String(args && "date" in args ? args.date : "");
      if (command === "list_entry_dates") return ["2020-01-01"];
      if (command === "read_entry") {
        return date === "2020-01-01"
          ? { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2, font: null }
          : null;
      }
      throw new Error(`unexpected command ${command}`);
    },
    { shouldMockEvents: true },
  );
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  const button = await screen.findByRole("button", { name: "日付を選ぶ" });
  fireEvent.click(button);
  await openNewYear2020(within(await screen.findByRole("dialog", { name: "日付の一覧" })));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.querySelector(".ProseMirror")?.textContent).toBe("雪"));
  await waitFor(() => expect(document.activeElement).toBe(button));
});

test("the header shows Hush's mark, named for screen readers", async () => {
  fakeVault();
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  const heading = await screen.findByRole("heading", { name: "Hush" });
  expect(heading.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
});

test("the header shows the day that is open, as year.month.day", async () => {
  mockIPC(
    (command, args) => {
      const date = String(args && "date" in args ? args.date : "");
      if (command === "list_entry_dates") return ["2020-01-01"];
      if (command === "read_entry") {
        return date === "2020-01-01"
          ? { date, body: "<p>雪</p>", createdAtMs: 1, updatedAtMs: 2, font: null }
          : null;
      }
      throw new Error(`unexpected command ${command}`);
    },
    { shouldMockEvents: true },
  );
  render(
    <UnlockedSession onLock={async () => {}}>
      <DiaryScreen />
    </UnlockedSession>,
  );
  await screen.findByRole("button", { name: "フォントを変える" });
  await openNewYear2020(within(document.body));
  const shown = document.querySelector("header time");
  expect(shown?.getAttribute("datetime")).toBe("2020-01-01");
  expect(shown?.textContent).toBe("2020.1.1");
});
