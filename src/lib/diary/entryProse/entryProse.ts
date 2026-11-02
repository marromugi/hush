import { clsx } from "clsx";

/**
 * How an entry's body looks, whether it is being written or read. Its width
 * is left to the page (36 characters of this size). Lines, and the
 * paragraphs Enter starts, sit closer than prose's own.
 */
export const entryProse = clsx(
  // typography
  "prose prose-stone prose-lg max-w-none dark:prose-invert",
  // spacing
  "leading-[1.6] prose-p:my-[0.5em]",
);

/**
 * Blurs and fades an entry's text while the font it is shown in loads,
 * and brings it back once loaded, so it does not jump from one font to
 * another. It stays faintly visible, so what is typed meanwhile can be seen.
 */
export function fontLoadingStyle(loading: boolean): string {
  return clsx(
    // motion
    "transition-[filter,opacity] duration-300 motion-reduce:transition-none",
    // effect
    loading && "opacity-30 blur-sm",
  );
}
