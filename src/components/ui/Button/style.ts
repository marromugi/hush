import { tv } from "../../../lib/ui/tv";

export const button = tv({
  base: [
    // layout
    "inline-flex items-center justify-center",
    // shape
    "rounded-md px-4 py-2",
    // color
    "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900",
    // state
    "disabled:opacity-50",
  ],
});
