import type { EntryHost } from "@/lib/diary/entryHost";
import {
  embedPagesOrigin,
  linkImage,
  linkPage,
  listenKeyboardMoves,
  readImage,
  saveImage,
} from "@/lib/vault/commands";

/** The Tauri app, doing for an entry what the Rust side's commands do. */
export const tauriEntryHost: EntryHost = {
  saveImage,
  readImage,
  linkPage,
  linkImage,
  embedPagesOrigin,
  listenKeyboardMoves,
};
