import { useEffect, useState } from "react";

import { useSettings } from "../../../../../hooks/settings/useSettings";
import { fontStack, loadFont } from "../../../../../lib/diary/fonts";
import type { SavedFont } from "../../../../../lib/settings/settings";

/**
 * The CSS `font-family` of the default font for the current language, once
 * it has loaded. While a newly chosen font loads, the one shown before stays.
 * `undefined` shows the standard font: when none is chosen, before any has
 * loaded, or when the chosen one cannot load.
 */
export function useDefaultFont(): string | undefined {
  const { language, defaultFonts } = useSettings();
  const saved = defaultFonts[language];
  const [shown, setShown] = useState<SavedFont | null>(null);

  useEffect(() => {
    if (saved === null) return undefined;
    let ignore = false;
    loadFont(saved, saved.stylesheet).then(
      () => {
        if (!ignore) setShown(saved);
      },
      // The standard font; choosing the font again in the settings says why.
      () => {
        if (!ignore) setShown(null);
      },
    );
    return () => {
      ignore = true;
    };
  }, [saved]);

  return saved !== null && shown !== null ? fontStack(shown) : undefined;
}
