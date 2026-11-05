import type { ReactNode } from "react";

export type RadialMenuProps = {
  /** The trigger's name for screen readers, since it shows only an icon. */
  label: string;
  /** The buttons that fan out, left to right. */
  children: ReactNode;
  defaultOpen?: boolean;
};
