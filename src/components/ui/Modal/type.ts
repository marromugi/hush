import type { ReactNode, RefObject } from "react";

export type ModalProps = {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Where the focus goes when it closes. Without it, the focus goes back to
   * where it was when it opened; give it when that place will be gone, as a
   * menu item that closed as the modal opened.
   */
  returnFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
};
