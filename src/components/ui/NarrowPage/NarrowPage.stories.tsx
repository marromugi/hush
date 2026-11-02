import type { Meta, StoryObj } from "@storybook/react-vite";

import { NarrowPage } from "./NarrowPage";

const meta = {
  title: "ui/NarrowPage",
  component: NarrowPage,
  parameters: { layout: "fullscreen" },
  args: { children: <p>日記帳を開くと、ここに中身が並びます。</p> },
} satisfies Meta<typeof NarrowPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
