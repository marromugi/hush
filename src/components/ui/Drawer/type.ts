import type { ReactNode, RefObject } from "react";

export type DrawerProps = {
  /** Read out as the panel's name; not shown. */
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where the focus goes when it closes; where it was when it opened, without it. */
  returnFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
};
