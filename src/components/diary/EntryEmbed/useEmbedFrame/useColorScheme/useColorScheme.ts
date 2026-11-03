import { useSyncExternalStore } from "react";

const DARK = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DARK);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the system is in light or dark mode, following it as it changes. */
export function useColorScheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, () =>
    window.matchMedia(DARK).matches ? "dark" : "light",
  );
}
