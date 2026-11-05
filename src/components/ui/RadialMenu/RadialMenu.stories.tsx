import type { Meta, StoryObj } from "@storybook/react-vite";

import { AlignCenterIcon, CloseIcon, DiceIcon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

import { RadialMenu } from "./RadialMenu";

const meta: Meta<typeof RadialMenu> = {
  title: "ui/RadialMenu",
  component: RadialMenu,
  args: {
    label: "メニュー",
    defaultOpen: true,
    children: <IconButton icon={DiceIcon} label="フォントを変える" type="button" />,
  },
  decorators: [
    (Story) => (
      <div className="flex h-64 items-end justify-center pb-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof RadialMenu>;

export const OneItem: Story = {};

export const Closed: Story = { args: { defaultOpen: false } };

export const ThreeItems: Story = {
  args: {
    children: [
      <IconButton key="a" icon={AlignCenterIcon} label="揃える" type="button" />,
      <IconButton key="b" icon={DiceIcon} label="フォントを変える" type="button" />,
      <IconButton key="c" icon={CloseIcon} label="閉じる" type="button" />,
    ],
  },
};
