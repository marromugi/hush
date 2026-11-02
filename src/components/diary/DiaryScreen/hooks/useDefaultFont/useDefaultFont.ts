import { useLoadedFont } from "../../../../../hooks/diary/useLoadedFont";
import { useSettings } from "../../../../../hooks/settings/useSettings";

/**
 * The CSS `font-family` of the default font for the current language, once
 * it has loaded; `undefined` for the standard font. Choosing the font again
 * in the settings says why one cannot load.
 */
export function useDefaultFont(): string | undefined {
  const { language, defaultFonts } = useSettings();
  return useLoadedFont(defaultFonts[language]);
}
