import { useEffect, useRef, useState } from "react";

import { useEntryFont } from "@/hooks/diary/useEntryFont";
import { useTodayEntry } from "@/hooks/diary/useTodayEntry";
import { useBeforeLock } from "@/hooks/vault/useBeforeLock";
import { useSession } from "@/hooks/vault/useSession";
import type { SavedFont } from "@/lib/diary/fonts";
import { localDate } from "@/lib/diary/localDate";

import { createAutoSaver } from "./createAutoSaver";
import { saveMessage } from "./saveMessage";
import type { SaveMessage } from "./saveMessage";

/** How long typing must pause before the entry is saved. */
const SAVE_DELAY_MS = 1000;

export type UseTodayScreen = {
  /** Fixed when the screen appears. */
  date: string;
  loading: boolean;
  /**
   * True when today's entry could not be read, which a toast says. No editor
   * is shown then, so nothing typed can overwrite the entry.
   */
  loadFailed: boolean;
  /**
   * The body an editor starts with: what was last typed, else what was
   * saved. The editor can be closed and opened again while saves wait.
   */
  initialBody: string;
  saveMessage: SaveMessage | null;
  onChange: (body: string) => void;
  /** The font the entry is in: the one picked last, else the one saved; `null` for the default font. */
  font: SavedFont | null;
  /** The CSS `font-family` to show the entry in: `font` once loaded, else the default font. */
  fontFamily: string | undefined;
  /** True while `font` loads. */
  fontLoading: boolean;
  /** Shows the entry in `font` and saves it with the newest body. Call it only once loaded. */
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
  // The dice hands over its font after loading it, from the render it was
  // pressed in, so the body typed meanwhile is read from here.
  const newestTyped = useRef<string | null>(null);
  const [picked, setPicked] = useState<SavedFont | null>(null);
  const font = picked ?? today.entry?.font ?? null;
  const shownFont = useEntryFont(font);
  const { locking } = useSession();

  const [saver] = useState(() => createAutoSaver(SAVE_DELAY_MS));
  useEffect(() => () => saver.cancel(), [saver]);
  useBeforeLock(() => saver.flush());

  return {
    date,
    loading: today.loading,
    loadFailed: today.loadError !== null,
    initialBody: typed ?? today.entry?.body ?? "",
    saveMessage: saveMessage({
      typed,
      entry: today.entry,
      saving: today.saving,
      saveError: today.saveError,
    }),
    onChange: (body) => {
      newestTyped.current = body;
      setTyped(body);
      saver.schedule(body, (saving) => today.save(saving, font));
    },
    font,
    fontFamily: shownFont.fontFamily,
    fontLoading: shownFont.loading,
    pickFont: (next) => {
      setPicked(next);
      // With nothing written yet, the font is saved with the first words.
      const body = newestTyped.current ?? today.entry?.body;
      if (body === undefined) return;
      // A roll is one change, not typing, so it is saved at once.
      saver.schedule(body, (saving) => today.save(saving, next));
      void saver.flush();
    },
    locking,
  };
}
