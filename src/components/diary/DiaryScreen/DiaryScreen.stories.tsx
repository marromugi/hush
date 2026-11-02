import type { Meta, StoryObj } from "@storybook/react-vite";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

import { localDate } from "../../../lib/diary/localDate";
import { DiaryScreen } from "./DiaryScreen";

/**
 * A fake Rust side that keeps entries in memory. Give past days oldest
 * first; today starts empty and comes after them.
 */
function fakeEntries(past: Record<string, string>) {
  const entries = new Map(Object.entries(past));
  mockIPC(
    (command, args) => {
      const date = String(args && "date" in args ? args.date : "");
      if (command === "list_entry_dates") return [...entries.keys()];
      if (command === "show_secret_key") return "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A";
      if (command === "read_entry") {
        const body = entries.get(date);
        return body === undefined ? null : { date, body, createdAtMs: 1, updatedAtMs: 2 };
      }
      if (command === "save_entry") {
        const body = String(args && "body" in args ? args.body : "");
        entries.set(date, body);
        return { date, body, createdAtMs: 1, updatedAtMs: Date.now() };
      }
      throw new Error(`unexpected command ${command}`);
    },
    { shouldMockEvents: true },
  );
  return clearMocks;
}

/** `days` before today, as `YYYY-MM-DD`. */
function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
}

const meta = {
  title: "diary/DiaryScreen",
  component: DiaryScreen,
  args: { onLock: async () => {} },
} satisfies Meta<typeof DiaryScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstDay: Story = { beforeEach: () => fakeEntries({}) };

export const WithPastDays: Story = {
  beforeEach: () =>
    fakeEntries({
      [daysAgo(400)]: "<p>去年の日記。</p>",
      [daysAgo(40)]: "<p>先月の日記。</p>",
      [daysAgo(3)]: "<p>三日前は晴れ。</p>",
      [daysAgo(1)]: "<p>昨日は雨。</p>",
    }),
};
