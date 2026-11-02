import type { Meta, StoryObj } from "@storybook/react-vite";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

import { UnlockedSession } from "@/components/vault/UnlockedSession";
import { localDate } from "@/lib/diary/localDate";

import { DiaryScreen } from "./DiaryScreen";

/**
 * A fake Rust side that keeps entries and images in memory. Give past days oldest
 * first; today starts empty and comes after them.
 */
function fakeEntries(past: Record<string, string>) {
  const entries = new Map(Object.entries(past));
  const images = new Map<string, Uint8Array>();
  mockIPC(
    (command, args) => {
      if (command === "save_image" && args instanceof Uint8Array) {
        const id = crypto.randomUUID().replaceAll("-", "");
        images.set(id, args);
        return id;
      }
      if (command === "read_image") {
        const image = images.get(String(args && "id" in args ? args.id : ""));
        if (!image) throw { kind: "noImage", message: "no image file with this id" };
        return image.slice().buffer;
      }
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
  decorators: [
    (Story) => (
      <UnlockedSession onLock={async () => {}}>
        <Story />
      </UnlockedSession>
    ),
  ],
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

/** A long entry for today and a month of days: scroll to see what stays put. */
export const LongEntry: Story = {
  beforeEach: () =>
    fakeEntries({
      ...Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [daysAgo(30 - i), `<p>${30 - i} 日前の日記。</p>`]),
      ),
      [daysAgo(0)]: Array.from(
        { length: 40 },
        (_, i) => `<p>${i + 1} 行目。今日は晴れで、午後から少し風が出てきました。</p>`,
      ).join(""),
    }),
};
