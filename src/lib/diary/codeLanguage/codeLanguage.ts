import { bundledLanguagesInfo } from "shiki";

/** The value that stands for no language: the code is shown in one color. */
export const PLAIN_TEXT = "text";

const PLAIN_TEXT_NAME = "テキスト";

/** The names shiki itself reads as plain text. */
const PLAIN_TEXT_NAMES = new Set([PLAIN_TEXT, "txt", "plaintext", "plain"]);

/** Every language a code block can be colored as, by shiki's id, with no language first. */
export const codeLanguages: readonly { value: string; label: string }[] = [
  { value: PLAIN_TEXT, label: PLAIN_TEXT_NAME },
  ...bundledLanguagesInfo.map((info) => ({ value: info.id, label: info.name })),
];

/** The name a code block's language is shown by; a language shiki does not know shows as written. */
export function codeLanguageName(language: string | null): string {
  if (language === null) return PLAIN_TEXT_NAME;
  return codeLanguages.find((option) => option.value === language)?.label ?? language;
}

/**
 * The language a code block gets from what was written after ```, as in
 * "```ts": an alias becomes shiki's id ("typescript"). Nothing, or a name
 * shiki reads as plain text ("txt"), becomes `null`. A name shiki does not
 * know is kept, lowercased, so it can be shown; it is colored as plain text.
 */
export function resolveCodeLanguage(written: string): string | null {
  const wanted = written.trim().toLowerCase();
  if (wanted === "" || PLAIN_TEXT_NAMES.has(wanted)) return null;
  const info = bundledLanguagesInfo.find(
    (candidate) => candidate.id === wanted || candidate.aliases?.includes(wanted),
  );
  return info?.id ?? wanted;
}
