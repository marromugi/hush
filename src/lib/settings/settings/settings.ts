import * as v from "valibot";

/** Where this device keeps its settings, in the WebView's storage. */
const KEY = "hush.settings";

/** A font chosen as the default, with what is needed to show it without asking again. */
const SavedFontShape = v.object({
  id: v.string(),
  family: v.string(),
  category: v.string(),
  /** The font's stylesheet at a pinned version, so it loads from the cache when offline. */
  stylesheet: v.string(),
});

const noFont = v.fallback(v.nullable(SavedFontShape), null);

/**
 * This device's settings. A value missing or not understood is its default,
 * so a setting added later reads from what was stored before.
 */
const SettingsShape = v.object({
  /** Which fonts the dice picks from: ones with Japanese, or with Latin, characters. */
  language: v.fallback(v.picklist(["ja", "en"]), "ja"),
  /** The font entries are shown in, for each language; `null` for the standard font. */
  defaultFonts: v.fallback(v.object({ ja: noFont, en: noFont }), { ja: null, en: null }),
});

export type Settings = v.InferOutput<typeof SettingsShape>;

export type Language = Settings["language"];

export type SavedFont = NonNullable<Settings["defaultFonts"]["ja"]>;

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
