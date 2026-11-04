import { useSyncExternalStore } from "react";

/** Wide enough for the sidebar beside the diary: Tailwind's `md`. */
export const WIDE = "(min-width: 48rem)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the window is at least `md` wide. */
export function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}
