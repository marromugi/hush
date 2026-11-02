import { clsx } from "clsx";

import { FontSection } from "./components/FontSection";
import { LanguageSection } from "./components/LanguageSection";
import { SECTIONS, useSettingsModal } from "./hooks/useSettingsModal";

/**
 * The modal's content, mounted only while it is open. From md up the sections
 * sit in a column on the left; below md there is no room for that, and they
 * sit in a row above the settings that scrolls sideways.
 */
export function SettingsBody() {
  const settings = useSettingsModal();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[8rem_1fr] md:gap-6">
      <nav aria-label="設定の項目" className="min-w-0">
        <ul
          className={clsx(
            // layout
            "flex gap-5 overflow-x-auto md:flex-col md:gap-0 md:overflow-visible",
            // scroll; the room around the row keeps the focus outline from being cut off
            "-m-1 p-1 [scrollbar-width:none]",
          )}
        >
          {SECTIONS.map((section) => (
            <li key={section.id} className="shrink-0">
              <button
                type="button"
                aria-current={settings.section === section.id ? "page" : undefined}
                className={clsx(
                  // layout
                  "cursor-pointer rounded-sm py-2 text-left whitespace-nowrap",
                  // underline: the chosen section's is drawn, the rest only on hover
                  "underline decoration-transparent decoration-2 underline-offset-6",
                  "hover:decoration-edge aria-[current=page]:decoration-current",
                  // focus
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  // motion
                  "transition duration-160 ease-out",
                )}
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
