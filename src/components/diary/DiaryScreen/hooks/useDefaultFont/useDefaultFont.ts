import { useEffect, useState } from "react";

import { useSettings } from "../../../../../hooks/settings/useSettings";
import { fontStack, loadFont } from "../../../../../lib/diary/fonts";

/**
 * The CSS `font-family` of the default font for the current language, once
 * it has loaded. `undefined` shows the standard font: when none is chosen,
 * while it loads, or when it cannot load.
 */
export function useDefaultFont(): string | undefined {
  const { language, defaultFonts } = useSettings();
  const saved = defaultFonts[language];
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (saved === null) return undefined;
    let ignore = false;
    loadFont(saved, saved.stylesheet).then(
      () => {
        if (!ignore) setLoaded(saved.id);
      },
      // The standard font stays; choosing the font again in the settings says why.
      () => {},
    );
    return () => {
      ignore = true;
    };
  }, [saved]);

  return saved !== null && loaded === saved.id ? fontStack(saved) : undefined;
}
