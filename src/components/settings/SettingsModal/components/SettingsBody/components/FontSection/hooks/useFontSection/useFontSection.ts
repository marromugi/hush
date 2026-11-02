import { useEffect, useState } from "react";

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
  /** True while a chosen font is checked and loaded. */
  choosing: boolean;
  chooseError: string | null;
  /** Makes `id` the default font once it has loaded; `null` goes back to the standard font. */
  choose: (id: string | null) => Promise<void>;
  /** The CSS `font-family` of the chosen font, for the sample. */
  sample: string | undefined;
};

/** The default font for the current language, chosen among its fonts. */
export function useFontSection(): UseFontSection {
  const { language, defaultFonts } = useSettings();
  const subset = subsetFor(language);
  const [listed, setListed] = useState<Listed | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [chooseError, setChooseError] = useState<string | null>(null);

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

  return {
    language,
    fonts,
    listError: current && "error" in current ? current.error : null,
    chosen,
    choosing,
    chooseError,
    choose: async (id) => {
      setChooseError(null);
      if (id === null) {
        keep(null);
        return;
      }
      const font = fonts?.find((candidate) => candidate.id === id);
      if (font === undefined) return;
      setChoosing(true);
      try {
        const details = await fontDetails(font.id, subset);
        if (!details.complete) {
          setChooseError("漢字を持たないフォントは選べません。");
          return;
        }
        await loadFont(font, details.stylesheet);
        keep({ ...font, stylesheet: details.stylesheet });
      } catch {
        setChooseError("フォントを読み込めませんでした。");
      } finally {
        setChoosing(false);
      }
    },
    sample: chosen === null ? undefined : fontStack(chosen),
  };
}
