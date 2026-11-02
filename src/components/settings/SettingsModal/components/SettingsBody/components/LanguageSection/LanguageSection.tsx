import { Radio } from "@/components/ui/Radio";

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
        <Radio
          key={language.value}
          name="language"
          value={language.value}
          label={language.label}
          checked={section.language === language.value}
          onChange={() => section.setLanguage(language.value)}
        />
      ))}
    </fieldset>
  );
}
