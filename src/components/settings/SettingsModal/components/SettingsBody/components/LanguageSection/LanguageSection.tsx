import { clsx } from "clsx";

import { useLanguageSection } from "./hooks/useLanguageSection";

const LANGUAGES = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
] as const;

/** Which writing language the fonts are for. */
export function LanguageSection() {
  const section = useLanguageSection();

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-semibold">言語</legend>
      <p className="text-sm opacity-70">
        サイコロが選ぶフォントと、ふだんのフォントの候補が、この言語の字を持つものに変わります。
      </p>
      {LANGUAGES.map((language) => (
        <label key={language.value} className="flex items-center gap-2">
          <input
            type="radio"
            name="language"
            value={language.value}
            checked={section.language === language.value}
            onChange={() => section.setLanguage(language.value)}
            className={clsx(
              // size
              "size-4",
              // color
              "accent-accent",
            )}
          />
          {language.label}
        </label>
      ))}
    </fieldset>
  );
}
