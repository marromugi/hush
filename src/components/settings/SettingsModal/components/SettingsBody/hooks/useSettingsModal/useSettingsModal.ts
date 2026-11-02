import { useState } from "react";

import { useSettings } from "../../../../../../../hooks/settings/useSettings";
import { writeSettings } from "../../../../../../../lib/settings/settings";
import type { Language } from "../../../../../../../lib/settings/settings";

/** The sections listed on the left of the settings, in order. */
export const SECTIONS = [{ id: "language", label: "言語" }] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export type UseSettingsModal = {
  /** The section shown on the right. */
  section: SectionId;
  showSection: (section: SectionId) => void;
  language: Language;
  /** Takes effect at once, and is kept on this device. */
  setLanguage: (language: Language) => void;
};

export function useSettingsModal(): UseSettingsModal {
  const [section, setSection] = useState<SectionId>("language");
  const settings = useSettings();

  return {
    section,
    showSection: setSection,
    language: settings.language,
    setLanguage: (language) => writeSettings({ language }),
  };
}
