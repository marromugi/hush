import type { Meta, StoryObj } from "@storybook/react-vite";

import { CloseIcon, DiceIcon, LogoIcon } from "./glyphs";
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

export const Dice: Story = { args: { icon: DiceIcon } };

/** Hush's mark, at the height the header shows it. */
export const Logo: Story = { args: { icon: LogoIcon, size: "xl" } };
