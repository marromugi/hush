import type { Meta, StoryObj } from "@storybook/react-vite";

import { SecretKeyNotice } from "./SecretKeyNotice";

const meta = {
  title: "vault/SecretKeyNotice",
  component: SecretKeyNotice,
  args: {
    secretKey: "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A",
    onKept: () => {},
    onLock: async () => {},
  },
} satisfies Meta<typeof SecretKeyNotice>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
