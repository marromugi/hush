import type { Meta, StoryObj } from "@storybook/react-vite";

import { HushError } from "@/lib/vault/hushError";

import { UnlockForm } from "./UnlockForm";

const meta = {
  title: "vault/UnlockForm",
  component: UnlockForm,
  args: { busy: false, error: null, onUnlock: async () => {} },
} satisfies Meta<typeof UnlockForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Busy: Story = { args: { busy: true } };

export const WrongPassphrase: Story = {
  args: { error: new HushError("wrongPassphrase", "wrong passphrase") },
};

export const BrokenVault: Story = {
  args: { error: new HushError("brokenVault", "broken vault") },
};
