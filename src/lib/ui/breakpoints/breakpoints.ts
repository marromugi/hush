/**
 * The widths the layout changes at. Tailwind's `md:` and the rest come from
 * here through `src/tailwind.config.ts`, so these are the only breakpoints.
 */
export const BREAKPOINTS = { md: "48rem" } as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** The media query that matches from the breakpoint up, as Tailwind's variant of the same name does. */
export function atLeast(name: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[name]})`;
}
