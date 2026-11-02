import { useEffect, useState } from "react";

import { useEntryFont } from "@/hooks/diary/useEntryFont";
import type { SavedFont } from "@/lib/diary/fonts";
import { readEntry } from "@/lib/vault/commands";
import { errorText } from "@/lib/vault/errorText";
import { toHushError } from "@/lib/vault/hushError";

type Read = { body: string | null; font: SavedFont | null } | { error: string };

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
  const [read, setRead] = useState<Read | null>(null);

  const font = useEntryFont(read && "font" in read ? read.font : null);

  useEffect(() => {
    let ignore = false;
    void readEntry(date).then(
      (entry) => {
        if (!ignore) setRead({ body: entry?.body ?? null, font: entry?.font ?? null });
      },
      (failure: unknown) => {
        if (!ignore) setRead({ error: errorText(toHushError(failure).kind) });
      },
    );
    return () => {
      ignore = true;
    };
  }, [date]);

  return {
    loading: read === null,
    body: read && "body" in read ? read.body : null,
    fontFamily: font.fontFamily,
    fontLoading: font.loading,
    error: read && "error" in read ? read.error : null,
  };
}
