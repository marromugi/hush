import { clsx } from "clsx";

/** How an entry's body looks, whether it is being written or read. */
export const entryProse = "prose prose-stone prose-lg dark:prose-invert";

/** Blurs an entry's text while the font it is shown in loads, so it does not jump from one font to another. */
export function fontLoadingBlur(loading: boolean): string {
  return clsx(
    // motion
    "transition-[filter] duration-300 motion-reduce:transition-none",
    // effect
    loading && "blur-sm",
  );
}
