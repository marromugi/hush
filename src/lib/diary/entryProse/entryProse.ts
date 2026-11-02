import { clsx } from "clsx";

/** How an entry's body looks, whether it is being written or read. */
export const entryProse = "prose prose-stone prose-lg dark:prose-invert";

/**
 * Blurs and fades out an entry's text while the font it is shown in loads,
 * and brings it back once loaded, so it does not jump from one font to another.
 */
export function fontLoadingStyle(loading: boolean): string {
  return clsx(
    // motion
    "transition-[filter,opacity] duration-300 motion-reduce:transition-none",
    // effect
    loading && "opacity-0 blur-sm",
  );
}
