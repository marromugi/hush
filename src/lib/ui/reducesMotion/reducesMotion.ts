/** The media query that is true while the person asks the system for less motion. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Whether the person asked the system for less motion. */
export function reducesMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
