import type { RefObject } from "react";

export type SecretKeyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where the focus goes when it closes; where it was when it opened, without it. */
  returnFocus?: RefObject<HTMLElement | null>;
};
