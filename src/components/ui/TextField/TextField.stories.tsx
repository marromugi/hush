import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextField } from "./TextField";

const meta = {
  title: "ui/TextField",
  component: TextField,
  args: { name: "passphrase", label: "パスフレーズ", type: "password" },
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = { args: { error: "パスフレーズが違います。" } };
