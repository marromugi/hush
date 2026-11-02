import type { RefObject } from "react";

export type SettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where the focus goes when it closes. */
  returnFocus?: RefObject<HTMLElement | null>;
};
