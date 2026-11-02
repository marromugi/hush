import { useEffect, useState } from "react";

import { fontStack, loadFont } from "../../../lib/diary/fonts";
import type { SavedFont } from "../../../lib/diary/fonts";

/**
 * The CSS `font-family` of `font`, once it has loaded. While a new font
 * loads, the one shown before stays. `undefined` shows the standard font:
 * when `font` is `null`, before any has loaded, or when it cannot load.
 */
export function useLoadedFont(font: SavedFont | null): string | undefined {
  const [shown, setShown] = useState<SavedFont | null>(null);
  // The same font comes back as a new object with each saved entry, so it is
  // loaded again only when what it names changes.
  const id = font?.id;
  const family = font?.family;
  const category = font?.category;
  const stylesheet = font?.stylesheet;

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
    let ignore = false;
    loadFont(next, stylesheet).then(
      () => {
        if (!ignore) setShown(next);
      },
      () => {
        if (!ignore) setShown(null);
      },
    );
    return () => {
      ignore = true;
    };
  }, [id, family, category, stylesheet]);

  return font !== null && shown !== null ? fontStack(shown) : undefined;
}
