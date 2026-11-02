import { optionRow } from "../../../../ui/Options";
import { FontSection } from "./components/FontSection";
import { LanguageSection } from "./components/LanguageSection";
import { SECTIONS, useSettingsModal } from "./hooks/useSettingsModal";

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
      {settings.section === "language" ? <LanguageSection /> : null}
      {settings.section === "font" ? <FontSection /> : null}
    </div>
  );
}
