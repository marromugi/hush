import { useEffect, useRef, useState } from "react";

import type { SavedFont } from "@/lib/diary/fonts";
import { toastError } from "@/lib/ui/toast";
import { readEntry, saveEntry } from "@/lib/vault/commands";
import type { EntryView } from "@/lib/vault/commands";
import { failureText } from "@/lib/vault/errorText";
import { toHushError } from "@/lib/vault/hushError";
import type { HushError } from "@/lib/vault/hushError";

import { shownFor } from "./shownFor";
import type { Loaded, SaveFailure } from "./shownFor";

export type UseTodayEntry = {
  /** True until the entry for `date` has been read. */
  loading: boolean;
  /** `null` when nothing has been written that day. */
  entry: EntryView | null;
  loadError: HushError | null;
  /**
   * Saves run one after another, in the order they were asked for. Resolves
   * true once this body and font are stored, false when storing them failed.
   */
  save: (body: string, font: SavedFont | null) => Promise<boolean>;
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
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let ignore = false;
    void readEntry(date).then(
      (entry) => {
        if (!ignore) setLoaded({ date, entry });
      },
      (failure: unknown) => {
        if (ignore) return;
        setLoaded({ date, error: toHushError(failure) });
        toastError(failureText(failure));
      },
    );
    return () => {
      ignore = true;
    };
  }, [date]);

  function save(body: string, font: SavedFont | null): Promise<boolean> {
    // The date the person was writing for, even if the day changes before
    // this save runs.
    const savingDate = date;
    setPendingSaves((count) => count + 1);
    const run = async () => {
      try {
        const entry = await saveEntry(savingDate, body, font);
        setSaveFailure((failure) => (failure?.date === savingDate ? null : failure));
        // A reply for a day that is no longer shown must not replace what is.
        setLoaded((shown) =>
          shown && shown.date !== savingDate ? shown : { date: savingDate, entry },
        );
        return true;
      } catch (failure) {
        setSaveFailure({ date: savingDate, error: toHushError(failure) });
        // The header keeps saying it failed; the toast makes sure it is seen.
        toastError(failureText(failure));
        return false;
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
