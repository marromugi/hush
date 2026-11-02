import * as v from "valibot";

/** Fonts come from Fontsource, which repackages Google Fonts with a public API and no key. */
const API = "https://api.fontsource.org/v1/fonts";

/** Font files are served from jsDelivr; a versioned URL never changes, so the WebView caches it for good. */
const CDN = "https://cdn.jsdelivr.net/npm/@fontsource";

/** A font the dice can choose. */
export type FontChoice = {
  /** Fontsource's id, as in `noto-sans-jp`. */
  id: string;
  /** The CSS family name, as in `Noto Sans JP`. */
  family: string;
  /** Fontsource's category: `sans-serif`, `serif`, `display`, `handwriting`, or `monospace`. */
  category: string;
};

/** What the list answers, kept only as far as it is used. */
const ListedFonts = v.array(
  v.object({ id: v.string(), family: v.string(), category: v.string(), type: v.string() }),
);

const FontDetails = v.object({ npmVersion: v.string() });

/** Google Fonts that have the characters of `subset`, as in `japanese` or `latin`. */
export async function listFonts(subset: string): Promise<FontChoice[]> {
  const response = await fetch(`${API}?subsets=${encodeURIComponent(subset)}`);
  if (!response.ok) throw new Error(`font list: ${response.status}`);
  const fonts = v.parse(ListedFonts, await response.json());
  return fonts
    .filter((font) => font.type === "google" && font.category !== "icons")
    .map(({ id, family, category }) => ({ id, family, category }));
}

/** The stylesheet of `id` at its current version. Japanese fonts are split by character range, so only the ranges a page uses are fetched. */
export async function stylesheetUrl(id: string): Promise<string> {
  const response = await fetch(`${API}/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`font ${id}: ${response.status}`);
  const { npmVersion } = v.parse(FontDetails, await response.json());
  return `${CDN}/${id}@${npmVersion}/index.css`;
}

/** A font other than `current`, chosen at random. `null` when there is no other. */
export function pickFont(
  fonts: FontChoice[],
  current: FontChoice | null,
  random: () => number = Math.random,
): FontChoice | null {
  const others = fonts.filter((font) => font.id !== current?.id);
  return others[Math.floor(random() * others.length)] ?? null;
}

const GENERIC: Record<string, string> = {
  serif: "serif",
  monospace: "monospace",
  handwriting: "cursive",
};

/** The CSS `font-family` for `font`, falling back to its kind while it loads or if it cannot. */
export function fontStack(font: FontChoice): string {
  return `"${font.family}", ${GENERIC[font.category] ?? "sans-serif"}`;
}

/** Text whose characters are fetched before a font is shown, so it does not flicker in. */
const SAMPLE = "今日は晴れ Aa";

/**
 * Adds the stylesheet of `font` to the page once, then fetches the font
 * for the sample text. Resolves once it can be shown.
 */
export async function loadFont(font: FontChoice, stylesheet: string): Promise<void> {
  if (document.querySelector(`link[data-font="${font.id}"]`) === null) {
    await new Promise<void>((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = stylesheet;
      link.dataset.font = font.id;
      link.addEventListener("load", () => resolve());
      link.addEventListener("error", () => {
        link.remove();
        reject(new Error(`font ${font.id}: stylesheet did not load`));
      });
      document.head.append(link);
    });
  }
  await document.fonts.load(`1em "${font.family}"`, SAMPLE);
}
