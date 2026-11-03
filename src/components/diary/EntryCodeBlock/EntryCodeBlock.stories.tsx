import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { entryProse } from "@/lib/diary/entryProse";

import { EntryCodeBlock } from "./EntryCodeBlock";

const meta = {
  title: "diary/EntryCodeBlock",
  component: EntryCodeBlock,
  args: {
    language: "typescript",
    children: (
      <pre>
        <code>const sky = "晴れ";</code>
      </pre>
    ),
  },
  decorators: [
    (Story) => (
      <div className={entryProse}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EntryCodeBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

/** As read: the language is only shown. */
export const Shown: Story = {};

/** Where it can be written: the language opens a popover to pick another. */
export const Changeable: Story = { args: { onLanguageChange: fn() } };

export const PlainText: Story = { args: { language: null, onLanguageChange: fn() } };
