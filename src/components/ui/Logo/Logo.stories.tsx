import type { Meta, StoryObj } from "@storybook/react-vite";

import { Logo } from "./Logo";

const meta = {
  title: "ui/Logo",
  component: Logo,
  args: { className: "h-24 w-auto" },
} satisfies Meta<typeof Logo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** As small as the header shows it. */
export const Small: Story = { args: { className: "h-6 w-auto" } };
