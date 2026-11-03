import { createParser } from "prosemirror-highlight/shiki";
import type { Parser } from "prosemirror-highlight/shiki";
import { bundledLanguagesInfo, createHighlighter } from "shiki";
import type { BundledLanguage, Highlighter } from "shiki";

import { PLAIN_TEXT } from "@/lib/diary/codeLanguage";

/** Colors for both schemes, as CSS variables; `src/styles.css` picks one per scheme. */
const THEMES = { light: "github-light", dark: "github-dark" } as const;

let highlighter: Highlighter | null = null;
let loadingHighlighter: Promise<void> | null = null;
let parse: Parser | null = null;
const loading = new Map<string, Promise<void>>();

function isBundled(language: string): language is BundledLanguage {
  return bundledLanguagesInfo.some(
    (info) => info.id === language || info.aliases?.includes(language),
  );
}

/**
 * Colors a code block's text with shiki. Shiki and each language are loaded
 * the first time a block needs them; until then the block stays one color,
 * and the returned promise tells the highlight plugin to try again once
 * they are in. A language shiki does not know is colored as plain text.
 */
export const shikiParser: Parser = (options) => {
  if (highlighter === null) {
    loadingHighlighter ??= createHighlighter({ themes: Object.values(THEMES), langs: [] }).then(
      (loaded) => {
        highlighter = loaded;
      },
    );
    return loadingHighlighter;
  }
  const language = options.language && isBundled(options.language) ? options.language : PLAIN_TEXT;
  if (language !== PLAIN_TEXT && !highlighter.getLoadedLanguages().includes(language)) {
    let pending = loading.get(language);
    if (pending === undefined) {
      pending = highlighter.loadLanguage(language);
      loading.set(language, pending);
    }
    return pending;
  }
  parse ??= createParser(highlighter, { themes: THEMES, defaultColor: false });
  return parse({ ...options, language });
};
