import type { Meta, StoryObj } from "@storybook/react-vite";

import { HushError } from "@/lib/vault/hushError";

import { NewDeviceUnlockForm } from "./NewDeviceUnlockForm";

const meta = {
  title: "vault/NewDeviceUnlockForm",
  component: NewDeviceUnlockForm,
  args: { busy: false, error: null, onUnlock: async () => {} },
} satisfies Meta<typeof NewDeviceUnlockForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InvalidSecretKey: Story = {
  args: { error: new HushError("invalidSecretKey", "text is not a secret key") },
};

export const WrongPassphraseOrSecretKey: Story = {
  args: {
    error: new HushError("wrongPassphraseOrSecretKey", "wrong passphrase or secret key"),
  },
};
