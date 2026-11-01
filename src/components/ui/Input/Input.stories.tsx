import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./Input";

const meta = {
  title: "ui/Input",
  component: Input,
  args: { type: "password", "aria-label": "パスフレーズ" },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Password: Story = {};
