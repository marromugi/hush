import type { SavedFont } from "../../../lib/diary/fonts";
import { useSettings } from "../../settings/useSettings";
import { useLoadedFont } from "../useLoadedFont";
import type { LoadedFont } from "../useLoadedFont";

/**
 * The font an entry is shown in: its own `font`, else the default font for
 * the current language, else the standard font. While its own font loads,
 * the font shown before stays.
 */
export function useEntryFont(font: SavedFont | null): LoadedFont {
  const { language, defaultFonts } = useSettings();
  const own = useLoadedFont(font);
  const fallback = useLoadedFont(defaultFonts[language]);
  if (own.loading) return { fontFamily: own.fontFamily ?? fallback.fontFamily, loading: true };
  return own.fontFamily === undefined ? fallback : own;
}
