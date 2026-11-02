import { useEffect, useState } from "react";

import { readEntry } from "../../../../../../../lib/vault/commands";
import { errorText } from "../../../../../../../lib/vault/errorText";
import { toHushError } from "../../../../../../../lib/vault/hushError";

type Read = { body: string | null } | { error: string };

export type UsePastEntry = {
  loading: boolean;
  /** `null` when nothing was written that day. */
  body: string | null;
  error: string | null;
};

/** The entry for `date`, read once. Give the component a `key` of the date. */
export function usePastEntry(date: string): UsePastEntry {
  const [read, setRead] = useState<Read | null>(null);

  useEffect(() => {
    let ignore = false;
    void readEntry(date).then(
      (entry) => {
        if (!ignore) setRead({ body: entry?.body ?? null });
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
    error: read && "error" in read ? read.error : null,
  };
}
