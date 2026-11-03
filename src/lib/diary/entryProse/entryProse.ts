import { clsx } from "clsx";

/**
 * How an entry's body looks, whether it is being written or read. Its size,
 * line height and letter spacing come from the variables `entryTextStyle`
 * sets around it, with the defaults when there are none. Its width is left
 * to the page. Lines, and the paragraphs Enter starts, sit closer than
 * prose's own.
 */
export const entryProse = clsx(
  // typography
  "prose prose-stone prose-lg max-w-none dark:prose-invert",
  "text-[length:var(--entry-size,18px)] leading-[var(--entry-line,1.6)] tracking-(--entry-tracking)",
  // spacing: the first and last paragraphs keep prose's flush edges
  "prose-p:my-[0.5em] [&>:first-child]:mt-0 [&>:last-child]:mb-0",
  // code: shiki's colors for each scheme, from the variables it sets on the block and each word
  "prose-pre:my-0 prose-pre:border prose-pre:border-edge",
  "prose-pre:bg-(--shiki-light-bg,var(--color-surface)) prose-pre:text-(--shiki-light,inherit)",
  "dark:prose-pre:bg-(--shiki-dark-bg,var(--color-surface)) dark:prose-pre:text-(--shiki-dark,inherit)",
  "[&_.shiki]:text-(--shiki-light) dark:[&_.shiki]:text-(--shiki-dark)",
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
