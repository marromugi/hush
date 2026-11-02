import { useSettings } from "../../../../../../../../../hooks/settings/useSettings";
import { TEXT_RANGES, writeSettings } from "../../../../../../../../../lib/settings/settings";
import type { TextSettings } from "../../../../../../../../../lib/settings/settings";

export type UseTextSection = {
  text: TextSettings;
  /** Changes one of the text settings; it takes effect at once, and is kept on this device. */
  change: (name: keyof TextSettings, value: number) => void;
  /** True while every text setting is its default. */
  initial: boolean;
  /** Puts every text setting back to its default. */
  reset: () => void;
};

const INITIAL: TextSettings = {
  size: TEXT_RANGES.size.initial,
  lineHeight: TEXT_RANGES.lineHeight.initial,
  letterSpacing: TEXT_RANGES.letterSpacing.initial,
};

export function useTextSection(): UseTextSection {
  const { text } = useSettings();
  return {
    text,
    change: (name, value) => writeSettings({ text: { ...text, [name]: value } }),
    initial:
      text.size === INITIAL.size &&
      text.lineHeight === INITIAL.lineHeight &&
      text.letterSpacing === INITIAL.letterSpacing,
    reset: () => writeSettings({ text: INITIAL }),
  };
}
