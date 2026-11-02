import type { ReactNode } from "react";

/**
 * A modal is named by its title when it shows one, and by `label`, which is
 * read out but not shown, when it does not.
 */
type Name = { title: string; label?: undefined } | { title?: undefined; label: string };

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
} & Name;
