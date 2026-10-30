import type { Meta, StoryObj } from "@storybook/react-vite";

import { DiaryEditor } from "./DiaryEditor";

const meta = {
  title: "diary/DiaryEditor",
  component: DiaryEditor,
} satisfies Meta<typeof DiaryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
