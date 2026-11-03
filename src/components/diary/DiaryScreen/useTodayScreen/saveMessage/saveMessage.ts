import type { EntryView } from "@/lib/vault/commands";
import { errorText } from "@/lib/vault/errorText";
import type { HushError } from "@/lib/vault/hushError";

export type SaveMessage = { text: string; failed: boolean };

/**
 * What to say about saving. `typed` is the newest body from the editor, or
 * null before anything was typed.
 */
export function saveMessage(state: {
  typed: string | null;
  entry: EntryView | null;
  saving: boolean;
  saveError: HushError | null;
}): SaveMessage | null {
  if (state.saveError) return { text: errorText(state.saveError.kind), failed: true };
  if (state.saving || (state.typed !== null && state.typed !== state.entry?.body)) {
    return { text: "保存中…", failed: false };
  }
  return state.entry ? { text: "保存しました", failed: false } : null;
}
