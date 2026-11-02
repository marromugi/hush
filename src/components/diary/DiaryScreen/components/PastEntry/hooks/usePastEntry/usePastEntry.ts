import { useEffect, useState } from "react";

import { useLoadedFont } from "../../../../../../../hooks/diary/useLoadedFont";
import type { SavedFont } from "../../../../../../../lib/diary/fonts";
import { readEntry } from "../../../../../../../lib/vault/commands";
import { errorText } from "../../../../../../../lib/vault/errorText";
import { toHushError } from "../../../../../../../lib/vault/hushError";

type Read = { body: string | null; font: SavedFont | null } | { error: string };

export type UsePastEntry = {
  loading: boolean;
  /** `null` when nothing was written that day. */
  body: string | null;
  /**
   * The CSS `font-family` of the font the entry was saved with, once it has
   * loaded; `undefined` without one, before it loads, or if it cannot.
   */
  fontFamily: string | undefined;
  error: string | null;
};

/** The entry for `date`, read once. Give the component a `key` of the date. */
export function usePastEntry(date: string): UsePastEntry {
  const [read, setRead] = useState<Read | null>(null);

  const fontFamily = useLoadedFont(read && "font" in read ? read.font : null);

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
    fontFamily,
    error: read && "error" in read ? read.error : null,
  };
}
