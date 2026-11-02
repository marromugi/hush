import type { Meta, StoryObj } from "@storybook/react-vite";

import { HushError } from "@/lib/vault/hushError";

import { CreateVaultForm } from "./CreateVaultForm";

const meta = {
  title: "vault/CreateVaultForm",
  component: CreateVaultForm,
  args: { busy: false, error: null, onCreate: async () => {} },
} satisfies Meta<typeof CreateVaultForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Busy: Story = { args: { busy: true } };

export const EmptyPassphrase: Story = {
  args: { error: new HushError("emptyPassphrase", "empty passphrase") },
};
