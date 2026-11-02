import { EntryReader } from "./components/EntryReader";
import { usePastEntry } from "./hooks/usePastEntry";
import type { PastEntryProps } from "./type";

/** A day before today, to read only, in the font it was saved with. */
export function PastEntry({ date }: PastEntryProps) {
  const entry = usePastEntry(date);

  if (entry.loading) return null;
  if (entry.error) {
    return (
      <p role="alert" className="text-sm text-error">
        {entry.error}
      </p>
    );
  }
  if (entry.body === null) return <p className="text-sm opacity-70">この日の日記はありません。</p>;
  return (
    <EntryReader body={entry.body} fontFamily={entry.fontFamily} fontLoading={entry.fontLoading} />
  );
}
