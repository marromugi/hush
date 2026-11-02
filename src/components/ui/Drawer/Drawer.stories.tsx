import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Drawer } from "./Drawer";

const meta = {
  title: "ui/Drawer",
  component: Drawer,
  parameters: { layout: "fullscreen" },
  args: {
    label: "日記の日付",
    open: true,
    onOpenChange: () => {},
    children: <p>2026 年 11 月</p>,
  },
} satisfies Meta<typeof Drawer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Opened() {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-6">
      <Button type="button" onClick={() => setOpen(true)}>
        開く
      </Button>
      <Drawer label="日記の日付" open={open} onOpenChange={setOpen}>
        <p>外を押すか、Escape か、閉じるボタンで閉じます。</p>
      </Drawer>
    </div>
  );
}

/** Opens from a button, and gives the focus back to it on closing. */
export const FromButton: Story = { render: () => <Opened /> };
