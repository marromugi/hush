import type { Meta, StoryObj } from "@storybook/react-vite";

import { WindowDragRegion } from "./WindowDragRegion";

/** Invisible: it only moves the window in the app. The outline shows where it is. */
const meta = {
  title: "ui/WindowDragRegion",
  component: WindowDragRegion,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="h-40 [&>div]:outline [&>div]:outline-accent">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WindowDragRegion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
