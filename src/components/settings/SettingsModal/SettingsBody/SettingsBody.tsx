import { clsx } from "clsx";

import { FontSection } from "./FontSection";
import { LanguageSection } from "./LanguageSection";
import { LockSection } from "./LockSection";
import { TextSection } from "./TextSection";
import { SECTIONS, useSettingsModal } from "./useSettingsModal";

/**
 * The modal's content, mounted only while it is open. From md up the sections
 * sit in a column on the left; below md there is no room for that, and they
 * sit in a row above the settings, sharing its width.
 */
export function SettingsBody() {
  const settings = useSettingsModal();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[10rem_1fr] md:gap-6">
      <nav aria-label="設定の項目" className="min-w-0">
        <ul
          className={clsx(
            // layout
            "flex gap-1 overflow-x-auto md:flex-col md:overflow-visible",
            // shape
            "rounded-container container-p-1 around-control-py-2",
            // typography; the corners are worked out from this line height
            "text-sm font-semibold",
            // color: a shade off the modal, lighter in dark and darker in light
            "bg-edge/40",
            // scroll
            "[scrollbar-width:none]",
          )}
        >
          {SECTIONS.map((section) => (
            <li key={section.id} className="flex-1 shrink-0 md:flex-none">
              <button
                type="button"
                aria-current={settings.section === section.id ? "page" : undefined}
                className={clsx(
                  // layout
                  "w-full cursor-pointer px-2 text-center whitespace-nowrap md:px-3 md:text-left",
                  // shape
                  "rounded-control control-py-2",
                  // color: the chosen section is filled in, the rest stay quiet until hovered
                  "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
                  "aria-[current=page]:bg-stone-900 aria-[current=page]:text-white aria-[current=page]:hover:text-white",
                  "dark:aria-[current=page]:bg-black",
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
      {settings.section === "text" ? <TextSection /> : null}
      {settings.section === "lock" ? <LockSection /> : null}
    </div>
  );
}
