import { useEffect, useRef, useState } from "react";

import { useSettings } from "../../../../../../../../../hooks/settings/useSettings";
import {
  fontDetails,
  fontStack,
  listFonts,
  loadFont,
  subsetFor,
} from "../../../../../../../../../lib/diary/fonts";
import type { FontChoice } from "../../../../../../../../../lib/diary/fonts";
import { readSettings, writeSettings } from "../../../../../../../../../lib/settings/settings";
import type { Language, SavedFont } from "../../../../../../../../../lib/settings/settings";

type Listed = { subset: string; fonts: FontChoice[] } | { subset: string; error: string };

export type UseFontSection = {
  language: Language;
  /** The fonts to choose from; `null` while they load or when they cannot. */
  fonts: FontChoice[] | null;
  listError: string | null;
  /** The default font for the language; `null` for the standard font. */
  chosen: SavedFont | null;
  /**
   * What the field offers: the fetched fonts, plus the chosen font and the one
   * being chosen when the list lacks them, so their names always show.
   */
  options: { value: string; label: string }[];
  /** The font the field shows: the one being chosen, else the chosen one. */
  value: string | null;
  /** True while a chosen font is checked and loaded. */
  choosing: boolean;
  chooseError: string | null;
  /**
   * Makes `id` the default font once it has loaded; `null` goes back to the
   * standard font. Only the latest choice is kept.
   */
  choose: (id: string | null) => Promise<void>;
  /** The CSS `font-family` of the chosen font, for the sample. */
  sample: string | undefined;
};

/** The default font for the current language, chosen among its fonts. */
export function useFontSection(): UseFontSection {
  const { language, defaultFonts } = useSettings();
  const subset = subsetFor(language);
  const [listed, setListed] = useState<Listed | null>(null);
  const [picking, setPicking] = useState<FontChoice | null>(null);
  const [chooseError, setChooseError] = useState<string | null>(null);
  // Counts choices, so a slow earlier one cannot overwrite a later one.
  const latest = useRef(0);

  useEffect(() => {
    let ignore = false;
    listFonts(subset).then(
      (fonts) => {
        if (!ignore) setListed({ subset, fonts });
      },
      () => {
        if (!ignore) setListed({ subset, error: "フォントの一覧を読み込めませんでした。" });
      },
    );
    return () => {
      ignore = true;
    };
  }, [subset]);

  const current = listed?.subset === subset ? listed : null;
  const fonts = current && "fonts" in current ? current.fonts : null;
  const chosen = defaultFonts[language];

  /** Stores `font` as the language's default, over what is stored now. */
  function keep(font: SavedFont | null) {
    writeSettings({ defaultFonts: { ...readSettings().defaultFonts, [language]: font } });
  }

  const offered = [...(fonts ?? [])];
  for (const font of [chosen, picking]) {
    if (font !== null && !offered.some((candidate) => candidate.id === font.id)) offered.push(font);
  }

  return {
    language,
    fonts,
    listError: current && "error" in current ? current.error : null,
    chosen,
    options: offered.map((font) => ({ value: font.id, label: font.family })),
    value: picking?.id ?? chosen?.id ?? null,
    choosing: picking !== null,
    chooseError,
    choose: async (id) => {
      latest.current += 1;
      const turn = latest.current;
      setChooseError(null);
      if (id === null) {
        setPicking(null);
        keep(null);
        return;
      }
      const font = fonts?.find((candidate) => candidate.id === id);
      if (font === undefined) return;
      setPicking(font);
      try {
        const details = await fontDetails(font.id, subset);
        if (turn !== latest.current) return;
        if (!details.complete) {
          setChooseError("漢字を持たないフォントは選べません。");
          return;
        }
        await loadFont(font, details.stylesheet);
        if (turn !== latest.current) return;
        keep({ ...font, stylesheet: details.stylesheet });
      } catch {
        if (turn === latest.current) setChooseError("フォントを読み込めませんでした。");
      } finally {
        if (turn === latest.current) setPicking(null);
      }
    },
    sample: chosen === null ? undefined : fontStack(chosen),
  };
}
