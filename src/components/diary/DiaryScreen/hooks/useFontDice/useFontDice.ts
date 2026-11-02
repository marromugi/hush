import { useRef } from "react";

import { useSingleFlight } from "@/hooks/common/useSingleFlight";
import { fontDetails, listFonts, loadFont, pickFont } from "@/lib/diary/fonts";
import type { FontChoice, FontDetails, SavedFont } from "@/lib/diary/fonts";
import { toastError } from "@/lib/ui/toast";

export type UseFontDice = {
  /** True while a new font is being fetched; the dice cannot be pressed then. */
  rolling: boolean;
  roll: () => Promise<void>;
};

/**
 * Picks a font other than `current` at random each roll, among fonts with
 * every character of `subset` (as `japanese`), and hands it to `onPick`
 * once it has loaded. Each subset's font list is fetched on its first roll
 * and kept. A roll that cannot change the font says so in a toast.
 */
export function useFontDice(
  subset: string,
  current: FontChoice | null,
  onPick: (font: SavedFont) => void,
): UseFontDice {
  const catalogs = useRef(new Map<string, Promise<FontChoice[]>>());
  // A font's details for a subset, once known, so a font shown before needs no network.
  const details = useRef(new Map<string, FontDetails>());
  // Fonts found to lack a subset's characters; they are not picked again for it.
  const lacking = useRef(new Set<string>());

  // Checked against a ref, so two presses before the button disables roll once.
  const { run: roll, running: rolling } = useSingleFlight(async () => {
    try {
      let catalog = catalogs.current.get(subset);
      if (catalog === undefined) {
        catalog = listFonts(subset).catch((failure: unknown) => {
          // A list that could not be fetched is asked for again next roll.
          catalogs.current.delete(subset);
          throw failure;
        });
        catalogs.current.set(subset, catalog);
      }
      const fonts = await catalog;
      for (;;) {
        const next = pickFont(
          fonts.filter((candidate) => !lacking.current.has(`${subset}/${candidate.id}`)),
          current,
        );
        if (next === null) return;
        const key = `${subset}/${next.id}`;
        const known = details.current.get(key) ?? (await fontDetails(next.id, subset));
        details.current.set(key, known);
        if (!known.complete) {
          lacking.current.add(key);
          continue;
        }
        await loadFont(next, known.stylesheet);
        onPick({ ...next, stylesheet: known.stylesheet });
        return;
      }
    } catch {
      toastError("フォントを読み込めませんでした。");
    }
  });

  return { rolling, roll };
}
