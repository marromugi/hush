import { clsx } from "clsx";

/** The look of one row in the menu beside the diary: faint until it is pointed at or is the day shown. */
export const menuItem = clsx(
  // layout
  "block cursor-pointer py-1",
  // typography
  "tabular-nums",
  // state
  "opacity-50 transition-opacity hover:opacity-100 aria-[current=date]:opacity-100",
);
