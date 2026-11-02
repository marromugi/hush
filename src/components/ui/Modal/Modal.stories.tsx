import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Modal } from "./Modal";

const meta = {
  title: "ui/Modal",
  component: Modal,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Secret Key",
    open: true,
    onOpenChange: () => {},
    children: <p>ほかの端末で日記帳を開くときに、パスフレーズと一緒に要ります。</p>,
  },
} satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** As tall as the screen allows, however little it holds. */
export const FullHeight: Story = { args: { height: "full" } };

function Opened() {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-6">
      <Button type="button" onClick={() => setOpen(true)}>
        開く
      </Button>
      <Modal title="Secret Key" open={open} onOpenChange={setOpen}>
        <p>外を押すか、Escape か、閉じるボタンで閉じます。</p>
      </Modal>
    </div>
  );
}

/** Opens from a button, and gives the focus back to it on closing. */
export const FromButton: Story = { render: () => <Opened /> };
