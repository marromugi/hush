import { useEffect, useState } from "react";

import { fontStack, loadFont } from "../../../lib/diary/fonts";
import type { SavedFont } from "../../../lib/diary/fonts";

export type LoadedFont = {
  /**
   * The CSS `font-family` of the font, once it has loaded. While a new font
   * loads, the one shown before stays. `undefined` shows the standard font:
   * without a font, before any has loaded, or when it cannot load.
   */
  fontFamily: string | undefined;
  /** True from when a font is given until it has loaded or failed to. */
  loading: boolean;
};

/**
 * The font that loaded last, and which font finished its last try, loaded or
 * not. `tried` is cleared when the font changes, so trying it again counts
 * as loading.
 */
type Settled = { shown: SavedFont | null; tried: string | null };

/** `font`, loaded into the page. */
export function useLoadedFont(font: SavedFont | null): LoadedFont {
  const [settled, setSettled] = useState<Settled | null>(null);
  // The same font comes back as a new object with each saved entry, so it is
  // loaded again only when what it names changes.
  const id = font?.id;
  const family = font?.family;
  const category = font?.category;
  const stylesheet = font?.stylesheet;
  const wanted = font === null ? null : nameOf(font);

  useEffect(() => {
    if (
      id === undefined ||
      family === undefined ||
      category === undefined ||
      stylesheet === undefined
    ) {
      return undefined;
    }
    const next = { id, family, category, stylesheet };
    const tried = nameOf(next);
    let ignore = false;
    loadFont(next, stylesheet).then(
      () => {
        if (!ignore) setSettled({ shown: next, tried });
      },
      () => {
        if (!ignore) setSettled({ shown: null, tried });
      },
    );
    return () => {
      ignore = true;
      setSettled((last) => last && { shown: last.shown, tried: null });
    };
  }, [id, family, category, stylesheet]);

  const shown = font === null ? null : (settled?.shown ?? null);
  return {
    fontFamily: shown === null ? undefined : fontStack(shown),
    loading: wanted !== null && settled?.tried !== wanted,
  };
}

function nameOf(font: SavedFont): string {
  return JSON.stringify([font.id, font.family, font.category, font.stylesheet]);
}
