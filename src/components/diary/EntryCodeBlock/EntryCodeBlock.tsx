import { clsx } from "clsx";

import { Combobox } from "@/components/ui/Combobox";
import { ChevronDownIcon, Icon } from "@/components/ui/Icon";
import { Popover } from "@/components/ui/Popover";

import type { EntryCodeBlockProps } from "./type";
import { useLanguagePicker } from "./useLanguagePicker";

const LABEL = "text-xs opacity-60";

/**
 * Code in an entry, with its language shown small above it. Where the code
 * can be changed, the language opens a popover to pick another.
 */
export function EntryCodeBlock({ language, onLanguageChange, children }: EntryCodeBlockProps) {
  const picker = useLanguagePicker(language, onLanguageChange);

  return (
    <div className="my-[1em]">
      <div contentEditable={false} className="mb-1 flex select-none">
        {onLanguageChange ? (
          <Popover
            open={picker.popover.isOpen}
            onOpenChange={picker.popover.setOpen}
            trigger={
              <button
                className={clsx(
                  // layout
                  "inline-flex cursor-pointer items-center gap-1",
                  // typography
                  LABEL,
                  // motion
                  "transition duration-160 ease-out",
                  // focus and hover
                  "rounded-sm outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent",
                )}
              >
                {picker.name}
                <Icon icon={ChevronDownIcon} size="sm" />
              </button>
            }
          >
            <div
              className={clsx(
                // size
                "w-64",
                // shape
                "rounded-container border border-edge container-p-3",
                // color
                "bg-surface-raised shadow-float",
              )}
            >
              <Combobox
                label="言語"
                options={picker.options}
                value={picker.value}
                onChange={picker.choose}
                focusOnMount
              />
            </div>
          </Popover>
        ) : (
          <span className={LABEL}>{picker.name}</span>
        )}
      </div>
      {children}
    </div>
  );
}
