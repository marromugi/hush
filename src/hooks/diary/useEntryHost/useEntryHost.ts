import { createContext, use } from "react";

import type { EntryHost } from "@/lib/diary/entryHost";

/** The app the entries below are written and read in. */
export const EntryHostContext = createContext<EntryHost | null>(null);

/** The app this entry is written and read in, from the nearest `EntryHostContext`. */
export function useEntryHost(): EntryHost {
  const host = use(EntryHostContext);
  if (host === null) {
    throw new Error("an entry is shown outside an EntryHostContext");
  }
  return host;
}
