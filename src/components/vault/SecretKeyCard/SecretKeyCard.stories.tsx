import type { Meta, StoryObj } from "@storybook/react-vite";

import { SecretKeyCard } from "./SecretKeyCard";

const meta = {
  title: "vault/SecretKeyCard",
  component: SecretKeyCard,
  args: { secretKey: "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A" },
} satisfies Meta<typeof SecretKeyCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
