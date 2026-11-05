import { useState } from "react";

/** The sections listed on the left of the settings, in order. */
export const SECTIONS = [
  { id: "language", label: "言語" },
  { id: "font", label: "フォント" },
  { id: "text", label: "文字" },
  { id: "music", label: "音楽" },
  { id: "lock", label: "ロック" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export type UseSettingsModal = {
  /** The section shown on the right. */
  section: SectionId;
  showSection: (section: SectionId) => void;
};

export function useSettingsModal(): UseSettingsModal {
  const [section, setSection] = useState<SectionId>("language");
  return { section, showSection: setSection };
}
