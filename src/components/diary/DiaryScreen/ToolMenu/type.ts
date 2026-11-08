import type { ReactNode } from "react";

export type ToolMenuProps = {
  /** The name of the pill and of the tools it raises, for screen readers; the pill shows nothing. */
  label: string;
  /** The tools, as buttons, the first nearest the pill. */
  children: ReactNode;
};
