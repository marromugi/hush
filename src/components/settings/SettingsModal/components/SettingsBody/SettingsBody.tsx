import { clsx } from "clsx";

import { optionRow } from "../../../../ui/Options";
import { SECTIONS, useSettingsModal } from "./hooks/useSettingsModal";

const LANGUAGES = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
] as const;

/** The modal's content, mounted only while it is open. */
export function SettingsBody() {
  const settings = useSettingsModal();

  return (
    <div className="grid grid-cols-[8rem_1fr] gap-6">
      <nav aria-label="設定の項目">
        <ul className="flex flex-col">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                aria-current={settings.section === section.id ? "page" : undefined}
                className={optionRow({ className: "aria-[current=page]:bg-edge" })}
                onClick={() => settings.showSection(section.id)}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {settings.section === "language" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 font-semibold">言語</legend>
          <p className="text-sm opacity-70">
            サイコロが選ぶフォントの候補が、この言語の字を持つものに変わります。
          </p>
          {LANGUAGES.map((language) => (
            <label key={language.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="language"
                value={language.value}
                checked={settings.language === language.value}
                onChange={() => settings.setLanguage(language.value)}
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
      ) : null}
    </div>
  );
}
