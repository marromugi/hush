import type { Meta, StoryObj } from "@storybook/react-vite";

import { DiaryEditor } from "./DiaryEditor";

const meta = {
  title: "diary/DiaryEditor",
  component: DiaryEditor,
  args: { initialBody: "", onChange: () => {}, disabled: false },
} satisfies Meta<typeof DiaryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Written: Story = { args: { initialBody: "<p>今日は晴れ。</p>" } };
