import * as v from "valibot";

import type { SavedFont } from "@/lib/diary/fonts";

/** Where this device keeps its settings, in the WebView's storage. */
const KEY = "hush.settings";

/** A font chosen as the default, with what is needed to show it without asking again. */
const SavedFontShape = v.object({
  id: v.string(),
  family: v.string(),
  category: v.string(),
  stylesheet: v.string(),
}) satisfies v.GenericSchema<unknown, SavedFont>;

const noFont = v.fallback(v.nullable(SavedFontShape), null);

/**
 * How the entry's text can be set: its size in px, and the space between
 * lines and between letters as multiples of that size. The defaults are how
 * entries looked before these could be set.
 */
export const TEXT_RANGES = {
  size: { min: 14, max: 24, step: 1, initial: 18 },
  lineHeight: { min: 1.2, max: 2.2, step: 0.1, initial: 1.6 },
  letterSpacing: { min: 0, max: 0.2, step: 0.01, initial: 0 },
} as const;

type Range = (typeof TEXT_RANGES)[keyof typeof TEXT_RANGES];

/**
 * A number inside `range`, put on its nearest step, as the slider would;
 * anything else reads as its default.
 */
const within = (range: Range) =>
  v.fallback(
    v.pipe(
      v.number(),
      v.minValue(range.min),
      v.maxValue(range.max),
      v.transform((value) => Number((Math.round(value / range.step) * range.step).toFixed(2))),
    ),
    range.initial,
  );

const TextShape = v.object({
  size: within(TEXT_RANGES.size),
  lineHeight: within(TEXT_RANGES.lineHeight),
  letterSpacing: within(TEXT_RANGES.letterSpacing),
});

/**
 * This device's settings. A value missing or not understood is its default,
 * so a setting added later reads from what was stored before.
 */
const SettingsShape = v.object({
  /** Which fonts the dice picks from: ones with Japanese, or with Latin, characters. */
  language: v.fallback(v.picklist(["ja", "en"]), "ja"),
  /** The font entries are shown in, for each language; `null` for the standard font. */
  defaultFonts: v.fallback(v.object({ ja: noFont, en: noFont }), { ja: null, en: null }),
  /** How the entry's text is set, the same for every language. */
  text: v.fallback(TextShape, {
    size: TEXT_RANGES.size.initial,
    lineHeight: TEXT_RANGES.lineHeight.initial,
    letterSpacing: TEXT_RANGES.letterSpacing.initial,
  }),
});

export type Settings = v.InferOutput<typeof SettingsShape>;

export type Language = Settings["language"];

export type TextSettings = Settings["text"];

const listeners = new Set<() => void>();
let read: { raw: string | null; settings: Settings } | null = null;

/** The settings as stored. The same object is returned until they change. */
export function readSettings(): Settings {
  const raw = storedText();
  if (read === null || read.raw !== raw) read = { raw, settings: parse(raw) };
  return read.settings;
}

/** Stores `change` over the current settings and tells everyone listening. */
export function writeSettings(change: Partial<Settings>): void {
  const next = { ...readSettings(), ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage refused (full, or turned off): the setting lasts until the app closes.
    read = { raw: storedText(), settings: next };
  }
  for (const listener of listeners) listener();
}

/** Calls `listener` whenever the settings change. Returns a function that stops it. */
export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function storedText(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Settings {
  try {
    return v.parse(SettingsShape, raw === null ? {} : JSON.parse(raw));
  } catch {
    return v.parse(SettingsShape, {});
  }
}
