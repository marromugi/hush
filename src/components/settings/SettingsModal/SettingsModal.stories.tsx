import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsModal } from "./SettingsModal";

const meta = {
  title: "settings/SettingsModal",
  component: SettingsModal,
  parameters: { layout: "fullscreen" },
  args: { open: true, onOpenChange: () => {} },
} satisfies Meta<typeof SettingsModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
