import { useEffect, useState } from "react";

import { useTodayEntry } from "../../../../../hooks/diary/useTodayEntry";
import { localDate } from "../../../../../lib/diary/localDate";
import { errorText } from "../../../../../lib/vault/errorText";
import { createAutoSaver } from "./lib/createAutoSaver";
import { saveMessage } from "./lib/saveMessage";
import type { SaveMessage } from "./lib/saveMessage";

/** How long typing must pause before the entry is saved. */
const SAVE_DELAY_MS = 1000;

export type UseTodayScreen = {
  /** Fixed when the screen appears. */
  date: string;
  loading: boolean;
  loadError: string | null;
  /** The body the editor starts with; later saves do not change the editor. */
  initialBody: string;
  saveMessage: SaveMessage | null;
  onChange: (body: string) => void;
  /** Saves what is waiting, then locks only if that save succeeded. */
  lock: () => Promise<void>;
};

export function useTodayScreen(onLock: () => Promise<void>): UseTodayScreen {
  const [date] = useState(() => localDate(new Date()));
  const today = useTodayEntry(date);
  const [typed, setTyped] = useState<string | null>(null);

  const [saver] = useState(() => createAutoSaver(SAVE_DELAY_MS));
  useEffect(() => () => saver.cancel(), [saver]);

  return {
    date,
    loading: today.loading,
    loadError: today.loadError ? errorText(today.loadError.kind) : null,
    initialBody: today.entry?.body ?? "",
    saveMessage: saveMessage({
      typed,
      entry: today.entry,
      saving: today.saving,
      saveError: today.saveError,
    }),
    onChange: (body) => {
      setTyped(body);
      saver.schedule(body, today.save);
    },
    lock: async () => {
      if (await saver.flush()) await onLock();
    },
  };
}
