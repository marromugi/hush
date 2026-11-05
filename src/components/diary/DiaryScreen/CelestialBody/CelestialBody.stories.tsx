import type { Meta, StoryObj } from "@storybook/react-vite";

import { CelestialBody } from "./CelestialBody";

const meta = {
  component: CelestialBody,
  args: { body: "saturn" },
  argTypes: {
    body: {
      control: "select",
      options: ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"],
    },
  },
} satisfies Meta<typeof CelestialBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saturn: Story = {};

/** The week from 日曜 to 土曜, at the size the header shows them. */
export const Week: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <CelestialBody body="sun" />
      <CelestialBody body="moon" />
      <CelestialBody body="mars" />
      <CelestialBody body="mercury" />
      <CelestialBody body="jupiter" />
      <CelestialBody body="venus" />
      <CelestialBody body="saturn" />
    </div>
  ),
};

/** Eight times larger, to see the surfaces. */
export const Large: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4 [&_canvas]:size-32">
      <CelestialBody body="sun" />
      <CelestialBody body="moon" />
      <CelestialBody body="mars" />
      <CelestialBody body="mercury" />
      <CelestialBody body="jupiter" />
      <CelestialBody body="venus" />
      <CelestialBody body="saturn" />
    </div>
  ),
};
