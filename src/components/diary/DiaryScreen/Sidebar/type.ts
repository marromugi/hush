import type { ReactNode } from "react";

export type SidebarProps = {
  /** Days to list, as `YYYY-MM-DD`, oldest first and each once. */
  dates: string[];
  selected: string;
  onSelect: (date: string) => void;
  /** Shown under the days, and kept in view when the days run long. */
  children?: ReactNode;
};
