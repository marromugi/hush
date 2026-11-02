import * as v from "valibot";

/** Fonts come from Fontsource, which repackages Google Fonts with a public API and no key. */
const API = "https://api.fontsource.org/v1/fonts";

/** How long a request may take before the font counts as not loaded. */
const TIMEOUT_MS = 15_000;

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

const FontDetailsAnswer = v.object({
  npmVersion: v.string(),
  unicodeRange: v.record(v.string(), v.string()),
});

/**
 * Japanese fonts come in numbered slices of characters. Fonts with the
 * common kanji have over 100 of them; fonts with fewer have kana and only
 * some kanji, so kanji would show in another font.
 */
const FULL_JAPANESE_SLICES = 100;

/** What is needed to show a font, and whether it has every character the text needs. */
export type FontDetails = {
  /** The stylesheet at the font's current version. */
  stylesheet: string;
  /** False when the font lacks characters of `subset`, as kanji in a kana-only font. */
  complete: boolean;
};

/**
 * Fonts whose letters are not letters: icons drawn from words, blobs, bars,
 * barcodes, and waveforms. Fontsource files some of them under ordinary
 * categories, so they are known by the start of their id.
 */
const NOT_TEXT = ["material-", "flow-", "redacted", "libre-barcode", "linefont", "wavefont"];

/** Google Fonts that have the characters of `subset`, as in `japanese` or `latin`, and draw them as text. */
export async function listFonts(subset: string): Promise<FontChoice[]> {
  const response = await fetch(`${API}?subsets=${encodeURIComponent(subset)}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`font list: ${response.status}`);
  const fonts = v.parse(ListedFonts, await response.json());
  return fonts
    .filter(
      (font) =>
        font.type === "google" &&
        font.category !== "icons" &&
        !NOT_TEXT.some((start) => font.id.startsWith(start)),
    )
    .map(({ id, family, category }) => ({ id, family, category }));
}

/**
 * The stylesheet of `id` at its current version, and whether it covers
 * `subset`. Japanese fonts are split by character range, so only the ranges
 * a page uses are fetched.
 */
export async function fontDetails(id: string, subset: string): Promise<FontDetails> {
  const response = await fetch(`${API}/${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`font ${id}: ${response.status}`);
  const { npmVersion, unicodeRange } = v.parse(FontDetailsAnswer, await response.json());
  const slices = Object.keys(unicodeRange).filter((key) => /^\[\d+\]$/.test(key)).length;
  return {
    stylesheet: `${CDN}/${id}@${npmVersion}/index.css`,
    complete: subset !== "japanese" || slices >= FULL_JAPANESE_SLICES,
  };
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
 * for the sample text. Resolves once it can be shown. On any failure the
 * stylesheet is taken out again, so a later call starts over.
 */
export async function loadFont(font: FontChoice, stylesheet: string): Promise<void> {
  let link = document.querySelector<HTMLLinkElement>(`link[data-font="${font.id}"]`);
  try {
    if (link === null) {
      const added = document.createElement("link");
      link = added;
      added.rel = "stylesheet";
      added.href = stylesheet;
      added.dataset.font = font.id;
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          added.addEventListener("load", () => resolve());
          added.addEventListener("error", () =>
            reject(new Error(`font ${font.id}: stylesheet did not load`)),
          );
          document.head.append(added);
        }),
        font.id,
      );
    }
    const faces = await withTimeout(document.fonts.load(`1em "${font.family}"`, SAMPLE), font.id);
    if (faces.length === 0) throw new Error(`font ${font.id}: no face loaded`);
  } catch (failure) {
    link?.remove();
    throw failure;
  }
}

function withTimeout<T>(promise: Promise<T>, id: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`font ${id}: timed out`)), TIMEOUT_MS),
    ),
  ]);
}

/** The characters the dice's fonts must have, for each writing language. */
export function subsetFor(language: "ja" | "en"): string {
  return language === "ja" ? "japanese" : "latin";
}
