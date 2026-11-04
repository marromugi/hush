/**
 * The widths the layout changes at, and the only breakpoints Tailwind knows:
 * `styles.css` clears its defaults and `src/tailwind.config.ts` adds these.
 */
export const BREAKPOINTS = { md: "48rem" } as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** The media query that matches from the breakpoint up, as Tailwind's variant of the same name does. */
export function atLeast(name: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[name]})`;
}
