import { usePromise } from "@/hooks/common/usePromise";
import { useEntryFont } from "@/hooks/diary/useEntryFont";
import { readEntry } from "@/lib/vault/commands";
import { errorText } from "@/lib/vault/errorText";
import { toHushError } from "@/lib/vault/hushError";

export type UsePastEntry = {
  loading: boolean;
  /** `null` when nothing was written that day. */
  body: string | null;
  /** The CSS `font-family` to show the entry in: its own font once loaded, else the default font. */
  fontFamily: string | undefined;
  /** True while the entry's own font loads. */
  fontLoading: boolean;
  error: string | null;
};

/** The entry for `date`, read once. Give the component a `key` of the date. */
export function usePastEntry(date: string): UsePastEntry {
  const read = usePromise(() => readEntry(date), date);
  const entry = read.status === "done" ? read.value : null;
  const font = useEntryFont(entry?.font ?? null);

  return {
    loading: read.status === "loading",
    body: entry?.body ?? null,
    fontFamily: font.fontFamily,
    fontLoading: font.loading,
    error: read.status === "failed" ? errorText(toHushError(read.error).kind) : null,
  };
}
