import type { Meta, StoryObj } from "@storybook/react-vite";

import { DiaryEditor } from "./DiaryEditor";

const meta = {
  title: "diary/DiaryEditor",
  component: DiaryEditor,
  args: { initialBody: "", onChange: () => {}, disabled: false },
} satisfies Meta<typeof DiaryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Written: Story = { args: { initialBody: "<p>今日は晴れ。</p>" } };

/** Code, colored by its language. Type ``` and Enter on an empty line to start another. */
export const WithCode: Story = {
  args: {
    initialBody:
      '<p>今日書いたコード。</p><pre><code class="language-typescript">const sky: string = "晴れ";\nconsole.log(sky);</code></pre><p>うまく動いた。</p>',
  },
};

/** While the font it is shown in loads. */
export const FontLoading: Story = {
  args: { initialBody: "<p>今日は晴れ。</p>", fontLoading: true },
};
