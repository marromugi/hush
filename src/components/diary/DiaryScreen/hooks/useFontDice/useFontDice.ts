import { useRef, useState } from "react";

import { fontDetails, listFonts, loadFont, pickFont } from "../../../../../lib/diary/fonts";
import type { FontChoice, FontDetails } from "../../../../../lib/diary/fonts";

/** The characters the dice's fonts must have. A language setting will choose this. */
const SUBSET = "japanese";

export type UseFontDice = {
  /** The font today's entry is shown in; `null` for the standard font. */
  font: FontChoice | null;
  /** True while a new font is being fetched; the dice cannot be pressed then. */
  rolling: boolean;
  /** Why the last roll could not change the font. */
  error: string | null;
  roll: () => Promise<void>;
};

/**
 * Picks another font at random each roll, among fonts with every character
 * the text needs. The font list is fetched on the first roll and kept; a
 * font is shown only once it has loaded.
 */
export function useFontDice(): UseFontDice {
  const [font, setFont] = useState<FontChoice | null>(null);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const catalog = useRef<Promise<FontChoice[]> | null>(null);
  // A font's details, once known, so a font shown before needs no network.
  const details = useRef(new Map<string, FontDetails>());
  // Fonts found to lack characters; they are not picked again.
  const lacking = useRef(new Set<string>());

  return {
    font,
    rolling,
    error,
    roll: async () => {
      if (rolling) return;
      setRolling(true);
      setError(null);
      try {
        catalog.current ??= listFonts(SUBSET).catch((failure: unknown) => {
          // A list that could not be fetched is asked for again next roll.
          catalog.current = null;
          throw failure;
        });
        const fonts = await catalog.current;
        for (;;) {
          const next = pickFont(
            fonts.filter((candidate) => !lacking.current.has(candidate.id)),
            font,
          );
          if (next === null) return;
          const known = details.current.get(next.id) ?? (await fontDetails(next.id, SUBSET));
          details.current.set(next.id, known);
          if (!known.complete) {
            lacking.current.add(next.id);
            continue;
          }
          await loadFont(next, known.stylesheet);
          setFont(next);
          return;
        }
      } catch {
        setError("フォントを読み込めませんでした。");
      } finally {
        setRolling(false);
      }
    },
  };
}
