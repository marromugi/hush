import type { Meta, StoryObj } from "@storybook/react-vite";

import { QrCode } from "./QrCode";

const meta = {
  title: "ui/QrCode",
  component: QrCode,
  args: { text: "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A", label: "QR コード" },
} satisfies Meta<typeof QrCode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
