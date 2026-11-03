import { createParser } from "prosemirror-highlight/shiki";
import type { Parser } from "prosemirror-highlight/shiki";
import { bundledLanguagesInfo, createHighlighter, createOnigurumaEngine } from "shiki";
import type { BundledLanguage, Highlighter } from "shiki";
import onigWasmUrl from "shiki/onig.wasm?url";

import { PLAIN_TEXT } from "@/lib/diary/codeLanguage";

/** Colors for both schemes, as CSS variables; `entryProse` picks one per scheme. */
const THEMES = { light: "github-light", dark: "github-dark" } as const;

let highlighter: Highlighter | null = null;
let loadingHighlighter: Promise<void> | null = null;
/** Set once shiki could not be loaded; code then stays one color without trying again. */
let failed = false;
let parse: Parser | null = null;
const loading = new Map<string, Promise<void>>();
/** Languages that could not be loaded; they are colored as plain text without trying again. */
const failedLanguages = new Set<string>();

/**
 * The regex engine's wasm, read as a file of its own. Shiki's built-in
 * loader unpacks a copy inlined in the script with `Response.bytes()`,
 * which older WebKit lacks.
 */
function loadRegexEngine() {
  return createOnigurumaEngine(() => fetch(onigWasmUrl).then((response) => response.arrayBuffer()));
}

function isBundled(language: string): language is BundledLanguage {
  return bundledLanguagesInfo.some(
    (info) => info.id === language || info.aliases?.includes(language),
  );
}

/**
 * Colors a code block's text with shiki. Shiki and each language are loaded
 * the first time a block needs them; until then the block stays one color,
 * and the returned promise tells the highlight plugin to try again once
 * they are in. A language shiki does not know, or one that fails to load,
 * is colored as plain text; if shiki itself fails to load, nothing is
 * colored.
 */
export const shikiParser: Parser = (options) => {
  if (failed) return [];
  if (highlighter === null) {
    loadingHighlighter ??= createHighlighter({
      themes: Object.values(THEMES),
      langs: [],
      engine: loadRegexEngine(),
    }).then(
      (loaded) => {
        highlighter = loaded;
      },
      () => {
        failed = true;
      },
    );
    return loadingHighlighter;
  }
  // A class written by hand or pasted may be in capitals ("language-TS"); shiki's names are lowercase.
  const named = options.language?.toLowerCase();
  const wanted = named && isBundled(named) ? named : PLAIN_TEXT;
  const loaded = highlighter.getLoadedLanguages().includes(wanted);
  // The plugin keeps what is returned for a block, so a language still loading returns its promise again.
  if (wanted !== PLAIN_TEXT && !loaded && !failedLanguages.has(wanted)) {
    let pending = loading.get(wanted);
    if (pending === undefined) {
      pending = highlighter.loadLanguage(wanted).catch(() => {
        failedLanguages.add(wanted);
      });
      loading.set(wanted, pending);
    }
    return pending;
  }
  const language = loaded ? wanted : PLAIN_TEXT;
  parse ??= createParser(highlighter, { themes: THEMES, defaultColor: false });
  return parse({ ...options, language });
};
