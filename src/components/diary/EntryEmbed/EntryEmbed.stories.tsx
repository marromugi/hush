import type { Meta, StoryObj } from "@storybook/react-vite";

import { entryProse } from "@/lib/diary/entryProse";

import { EntryEmbed } from "./EntryEmbed";

const meta = {
  title: "diary/EntryEmbed",
  component: EntryEmbed,
  args: { embed: { site: "youtube", id: "aqz-KE-bpKQ" } },
  decorators: [
    (Story) => (
      <div className={entryProse}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EntryEmbed>;

export default meta;

type Story = StoryObj<typeof meta>;

export const YouTube: Story = {};

export const PostOnX: Story = { args: { embed: { site: "x", id: "20" } } };

export const Selected: Story = { args: { selected: true } };
