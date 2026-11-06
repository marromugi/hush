import type { Preview } from "@storybook/react-vite";

import { EntryHostContext } from "@/hooks/diary/useEntryHost";
import { tauriEntryHost } from "@/lib/diary/tauriEntryHost";

import "@/styles.css";

const preview: Preview = {
  // Stories show the Tauri app's screens, with its commands faked by `mockIPC`.
  decorators: [
    (Story) => (
      <EntryHostContext value={tauriEntryHost}>
        <Story />
      </EntryHostContext>
    ),
  ],
};

export default preview;
