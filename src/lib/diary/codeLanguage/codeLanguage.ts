import { bundledLanguagesInfo } from "shiki";

/** The value that stands for no language: the code is shown in one color. */
export const PLAIN_TEXT = "text";

const PLAIN_TEXT_NAME = "テキスト";

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
 * "```ts": an alias becomes shiki's id ("typescript"), and nothing becomes
 * `null`. A name shiki does not know is kept, lowercased, so it can be
 * shown; it is colored as plain text.
 */
export function resolveCodeLanguage(written: string): string | null {
  const wanted = written.trim().toLowerCase();
  if (wanted === "" || wanted === PLAIN_TEXT) return null;
  const info = bundledLanguagesInfo.find(
    (candidate) => candidate.id === wanted || candidate.aliases?.includes(wanted),
  );
  return info?.id ?? wanted;
}
