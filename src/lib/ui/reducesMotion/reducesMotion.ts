/** Whether the person asked the system for less motion. */
export function reducesMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
