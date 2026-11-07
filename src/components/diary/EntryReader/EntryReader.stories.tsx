import type { Meta, StoryObj } from "@storybook/react-vite";

import { EntryReader } from "./EntryReader";

const meta = {
  title: "diary/EntryReader",
  component: EntryReader,
  args: { body: "<p>今日は晴れ。</p>" },
} satisfies Meta<typeof EntryReader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Written: Story = {};

/** While the font it is shown in loads. */
export const FontLoading: Story = { args: { fontLoading: true } };
