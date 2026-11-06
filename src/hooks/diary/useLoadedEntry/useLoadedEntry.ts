import { useSyncExternalStore } from "react";

import { loadedEntry, subscribeLoaded } from "@/lib/diary/editorChannel";
import type { Loaded } from "@/lib/diary/editorChannel";

/** The entry the app around the editor page gave last; `null` until it gives one. */
export function useLoadedEntry(): Loaded | null {
  return useSyncExternalStore(subscribeLoaded, loadedEntry);
}
