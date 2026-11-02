import type { Meta, StoryObj } from "@storybook/react-vite";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { fn } from "storybook/test";

import { EntryImage } from "./EntryImage";

/** A small JPEG drawn on the spot: a sky over a field. */
async function sampleJpeg(): Promise<ArrayBuffer> {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d canvas");
  context.fillStyle = "#9cc4e4";
  context.fillRect(0, 0, 640, 320);
  context.fillStyle = "#7a9a5a";
  context.fillRect(0, 320, 640, 160);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg");
  });
  if (!blob) throw new Error("no JPEG");
  return blob.arrayBuffer();
}

const meta = {
  title: "diary/EntryImage",
  component: EntryImage,
  args: { id: "0123456789abcdef0123456789abcdef" },
} satisfies Meta<typeof EntryImage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Shown: Story = {
  beforeEach: () => {
    mockIPC(() => sampleJpeg());
    return clearMocks;
  },
};

export const Selected: Story = {
  ...Shown,
  args: { selected: true },
};

/** At 60% of the entry's width. */
export const Narrow: Story = {
  ...Shown,
  args: { width: 60 },
};

/** Selected where it can be resized: drag the grip on its right edge. */
export const Resizable: Story = {
  ...Shown,
  args: { selected: true, width: 60, onResize: fn() },
};

/** The image file is not on this device. */
export const Missing: Story = {
  beforeEach: () => {
    mockIPC(() => {
      throw { kind: "noImage", message: "no image file with this id" };
    });
    return clearMocks;
  },
};
