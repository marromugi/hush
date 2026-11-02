import type { Meta, StoryObj } from "@storybook/react-vite";

import { CloseIcon } from "./glyphs";
import { Icon } from "./Icon";

const meta = {
  title: "ui/Icon",
  component: Icon,
  args: { icon: CloseIcon },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Close: Story = {};

export const Large: Story = { args: { size: "lg" } };
