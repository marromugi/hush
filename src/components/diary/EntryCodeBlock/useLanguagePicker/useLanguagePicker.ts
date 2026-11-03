import { useDisclosure } from "@/hooks/common/useDisclosure";
import { PLAIN_TEXT, codeLanguageName, codeLanguages } from "@/lib/diary/codeLanguage";

/**
 * The popover that changes a code block's language: what the block is shown
 * as, the choices, and `choose`, which hands the picked language on (`null`
 * for plain text) and closes the popover. Clearing the text in the combobox
 * changes nothing; only a pick does.
 */
export function useLanguagePicker(
  language: string | null,
  onLanguageChange: ((language: string | null) => void) | undefined,
) {
  const popover = useDisclosure();
  return {
    name: codeLanguageName(language),
    value: language ?? PLAIN_TEXT,
    options: codeLanguages,
    popover,
    choose: (picked: string | null) => {
      if (picked === null) return;
      onLanguageChange?.(picked === PLAIN_TEXT ? null : picked);
      popover.close();
    },
  };
}
