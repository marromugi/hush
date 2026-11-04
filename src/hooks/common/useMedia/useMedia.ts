import { useSyncExternalStore } from "react";

import { atLeast } from "@/lib/ui/breakpoints";
import type { Breakpoint } from "@/lib/ui/breakpoints";

/** Whether the window is at least as wide as the breakpoint. */
export function useMedia(name: Breakpoint): boolean {
  const query = atLeast(name);
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}
