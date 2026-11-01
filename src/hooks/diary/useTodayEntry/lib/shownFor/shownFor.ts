import type { EntryView } from "../../../../../lib/vault/commands";
import type { HushError } from "../../../../../lib/vault/hushError";

/** What was loaded, and for which date. */
export type Loaded = { date: string; entry: EntryView | null } | { date: string; error: HushError };

export type SaveFailure = { date: string; error: HushError };

export type Shown = {
  loading: boolean;
  entry: EntryView | null;
  loadError: HushError | null;
  saveError: HushError | null;
};

/** What to show for `date`. A result kept for another date is not shown. */
export function shownFor(
  date: string,
  loaded: Loaded | null,
  saveFailure: SaveFailure | null,
): Shown {
  const current = loaded?.date === date ? loaded : null;
  return {
    loading: current === null,
    entry: current && "entry" in current ? current.entry : null,
    loadError: current && "error" in current ? current.error : null,
    saveError: saveFailure?.date === date ? saveFailure.error : null,
  };
}
