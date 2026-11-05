import type { Meta, StoryObj } from "@storybook/react-vite";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

import { entryProse } from "@/lib/diary/entryProse";

import { EntryLinkCard } from "./EntryLinkCard";

/** A JPEG in the Open Graph shape drawn on the spot: a pale sky over a bright sea. */
async function sampleJpeg(): Promise<ArrayBuffer> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d canvas");
  context.fillStyle = "#dceaf4";
  context.fillRect(0, 0, 1200, 380);
  context.fillStyle = "#3f86b8";
  context.fillRect(0, 380, 1200, 250);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg");
  });
  if (!blob) throw new Error("no JPEG");
  return blob.arrayBuffer();
}

const meta = {
  title: "diary/EntryLinkCard",
  component: EntryLinkCard,
  args: {
    url: "https://www.example.com/blog/sea",
    title: "夏の終わりに、海へ行った日のこと",
    image: "0123456789abcdef0123456789abcdef",
  },
  decorators: [
    (Story) => (
      <div className={entryProse}>
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    mockIPC(() => sampleJpeg());
    return clearMocks;
  },
} satisfies Meta<typeof EntryLinkCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Shown: Story = {};

/** A title too long for two lines is cut at the end of the second. */
export const LongTitle: Story = {
  args: {
    title:
      "夏の終わりに海へ行った日のこと。朝早くに家を出て、電車を二つ乗り継ぎ、まだ誰もいない砂浜で波の音を聞きながら、持ってきたパンを食べた",
  },
};

/** The page names no picture. */
export const NoPicture: Story = { args: { image: null } };

/** The page named no title: the link stands in for it. */
export const NoTitle: Story = { args: { title: null, image: null } };

/** Just pasted, while the page is read. */
export const Loading: Story = { args: { title: null, image: null, loading: true } };

export const Selected: Story = { args: { selected: true } };
