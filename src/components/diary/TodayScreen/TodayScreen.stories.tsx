import type { Meta, StoryObj } from "@storybook/react-vite";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

import { TodayScreen } from "./TodayScreen";

/** A fake Rust side that keeps one day's entry in memory. */
function fakeEntry(body: string | null) {
  let stored = body;
  mockIPC((command, args) => {
    const date = String(args && "date" in args ? args.date : "");
    if (command === "read_entry") {
      return stored === null ? null : { date, body: stored, createdAtMs: 1, updatedAtMs: 2 };
    }
    if (command === "save_entry") {
      stored = String(args && "body" in args ? args.body : "");
      return { date, body: stored, createdAtMs: 1, updatedAtMs: Date.now() };
    }
    throw new Error(`unexpected command ${command}`);
  });
  return clearMocks;
}

const meta = {
  title: "diary/TodayScreen",
  component: TodayScreen,
  args: { onLock: async () => {} },
} satisfies Meta<typeof TodayScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = { beforeEach: () => fakeEntry(null) };

export const Written: Story = { beforeEach: () => fakeEntry("<p>今日は晴れ。</p>") };
