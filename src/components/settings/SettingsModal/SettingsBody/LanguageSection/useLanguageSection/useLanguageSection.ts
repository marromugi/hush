import { useSettings } from "@/hooks/settings/useSettings";
import { writeSettings } from "@/lib/settings/settings";
import type { Language } from "@/lib/settings/settings";

export type UseLanguageSection = {
  language: Language;
  /** Takes effect at once, and is kept on this device. */
  setLanguage: (language: Language) => void;
};

export function useLanguageSection(): UseLanguageSection {
  const { language } = useSettings();
  return { language, setLanguage: (next) => writeSettings({ language: next }) };
}
