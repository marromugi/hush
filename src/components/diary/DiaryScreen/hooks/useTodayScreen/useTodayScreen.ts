import { useEffect, useState } from "react";

import { useLoadedFont } from "../../../../../hooks/diary/useLoadedFont";
import { useTodayEntry } from "../../../../../hooks/diary/useTodayEntry";
import { useBeforeLock } from "../../../../../hooks/vault/useBeforeLock";
import { useSession } from "../../../../../hooks/vault/useSession";
import type { SavedFont } from "../../../../../lib/diary/fonts";
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
  /**
   * The body an editor starts with: what was last typed, else what was
   * saved. The editor can be closed and opened again while saves wait.
   */
  initialBody: string;
  saveMessage: SaveMessage | null;
  onChange: (body: string) => void;
  /** The font the entry is in: the one picked last, else the one saved; `null` for the default font. */
  font: SavedFont | null;
  /** The CSS `font-family` of `font` once it has loaded; `undefined` until then, or without one. */
  fontFamily: string | undefined;
  /** Shows the entry in `font` and saves it with the entry. */
  pickFont: (font: SavedFont) => void;
  /** True while locking; nothing can be typed then. */
  locking: boolean;
};

/**
 * Today's entry and its font, saved as they change. The vault waits for what is still
 * waiting to be saved before it locks, and stays unlocked if that save fails.
 */
export function useTodayScreen(): UseTodayScreen {
  const [date] = useState(() => localDate(new Date()));
  const today = useTodayEntry(date);
  const [typed, setTyped] = useState<string | null>(null);
  const [picked, setPicked] = useState<SavedFont | null>(null);
  const font = picked ?? today.entry?.font ?? null;
  const fontFamily = useLoadedFont(font);
  const { locking } = useSession();

  const [saver] = useState(() => createAutoSaver(SAVE_DELAY_MS));
  useEffect(() => () => saver.cancel(), [saver]);
  useBeforeLock(() => saver.flush());

  return {
    date,
    loading: today.loading,
    loadError: today.loadError ? errorText(today.loadError.kind) : null,
    initialBody: typed ?? today.entry?.body ?? "",
    saveMessage: saveMessage({
      typed,
      entry: today.entry,
      saving: today.saving,
      saveError: today.saveError,
    }),
    onChange: (body) => {
      setTyped(body);
      saver.schedule(body, (saving) => today.save(saving, font));
    },
    font,
    fontFamily,
    pickFont: (next) => {
      setPicked(next);
      // With nothing written yet, the font is saved with the first words.
      const body = typed ?? today.entry?.body;
      if (body === undefined) return;
      // A roll is one change, not typing, so it is saved at once.
      saver.schedule(body, (saving) => today.save(saving, next));
      void saver.flush();
    },
    locking,
  };
}
