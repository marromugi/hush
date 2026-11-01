import { useEffect, useRef, useState } from "react";

import { readEntry, saveEntry } from "../../../lib/vault/commands";
import type { EntryView } from "../../../lib/vault/commands";
import { toHushError } from "../../../lib/vault/hushError";
import type { HushError } from "../../../lib/vault/hushError";
import { shownFor } from "./lib/shownFor";
import type { Loaded, SaveFailure } from "./lib/shownFor";

export type UseTodayEntry = {
  /** True until the entry for `date` has been read. */
  loading: boolean;
  /** `null` when nothing has been written that day. */
  entry: EntryView | null;
  loadError: HushError | null;
  /** Saves run one after another, in the order they were asked for. */
  save: (body: string) => Promise<void>;
  saving: boolean;
  saveError: HushError | null;
};

/**
 * The entry for `date` (YYYY-MM-DD), read when `date` changes. Use it only
 * while the vault is unlocked, in a component that mounts on unlock, so each
 * unlock starts with a fresh read.
 */
export function useTodayEntry(date: string): UseTodayEntry {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [saveFailure, setSaveFailure] = useState<SaveFailure | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

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

  function save(body: string): Promise<void> {
    // The date the person was writing for, even if the day changes before
    // this save runs.
    const savingDate = date;
    setPendingSaves((count) => count + 1);
    const run = async () => {
      try {
        const entry = await saveEntry(savingDate, body);
        setSaveFailure((failure) => (failure?.date === savingDate ? null : failure));
        // A reply for a day that is no longer shown must not replace what is.
        setLoaded((shown) =>
          shown && shown.date !== savingDate ? shown : { date: savingDate, entry },
        );
      } catch (failure) {
        setSaveFailure({ date: savingDate, error: toHushError(failure) });
      } finally {
        setPendingSaves((count) => count - 1);
      }
    };
    const next = saveQueue.current.then(run);
    saveQueue.current = next;
    return next;
  }

  return {
    ...shownFor(date, loaded, saveFailure),
    save,
    saving: pendingSaves > 0,
  };
}
