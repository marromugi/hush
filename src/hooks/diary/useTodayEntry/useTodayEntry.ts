import { useEffect, useState } from "react";

import { readEntry, saveEntry } from "../../../lib/vault/commands";
import type { EntryView } from "../../../lib/vault/commands";
import { toHushError } from "../../../lib/vault/hushError";
import type { HushError } from "../../../lib/vault/hushError";

/** What was loaded, and for which date. */
type Loaded = { date: string; entry: EntryView | null } | { date: string; error: HushError };

export type UseTodayEntry = {
  /** True until the entry for `date` has been read. */
  loading: boolean;
  /** `null` when nothing has been written that day. */
  entry: EntryView | null;
  loadError: HushError | null;
  save: (body: string) => Promise<void>;
  saving: boolean;
  saveError: HushError | null;
};

/** The entry for `date` (YYYY-MM-DD), read when `date` changes. */
export function useTodayEntry(date: string): UseTodayEntry {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<HushError | null>(null);

  useEffect(() => {
    let ignore = false;
    void readEntry(date).then(
      (entry) => {
        if (!ignore) setLoaded({ date, entry });
      },
      (failure: unknown) => {
        if (!ignore) setLoaded({ date, error: toHushError(failure) });
      },
    );
    return () => {
      ignore = true;
    };
  }, [date]);

  const current = loaded?.date === date ? loaded : null;

  async function save(body: string) {
    setSaving(true);
    setSaveError(null);
    try {
      const entry = await saveEntry(date, body);
      setLoaded({ date, entry });
    } catch (failure) {
      setSaveError(toHushError(failure));
    } finally {
      setSaving(false);
    }
  }

  return {
    loading: current === null,
    entry: current && "entry" in current ? current.entry : null,
    loadError: current && "error" in current ? current.error : null,
    save,
    saving,
    saveError,
  };
}
