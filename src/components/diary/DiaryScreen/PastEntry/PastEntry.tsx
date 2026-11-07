import { EntryReader } from "@/components/diary/EntryReader";

import type { PastEntryProps } from "./type";
import { usePastEntry } from "./usePastEntry";

/** A day before today, to read only, in the font it was saved with. */
export function PastEntry({ date }: PastEntryProps) {
  const entry = usePastEntry(date);

  if (entry.loading || entry.failed) return null;
  if (entry.body === null) return <p className="text-sm opacity-70">この日の日記はありません。</p>;
  return (
    <EntryReader body={entry.body} fontFamily={entry.fontFamily} fontLoading={entry.fontLoading} />
  );
}
