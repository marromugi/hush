import { tv } from "../../../lib/ui/tv";

export const input = tv({
  base: [
    // layout
    "block w-full",
    // shape
    "rounded-md border px-3 py-2",
    // color
    "border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900",
    // focus
    "outline-none focus:border-stone-500",
  ],
});
