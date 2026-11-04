import { useSyncExternalStore } from "react";

type Side = "top" | "bottom";

let probe: HTMLElement | null = null;

/** An element padded by the safe-area insets, kept for the life of the page; the browser resolves them to pixels there. */
function inset(side: Side): number {
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;" +
      "padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
    document.body.append(probe);
  }
  const style = getComputedStyle(probe);
  return parseFloat(side === "top" ? style.paddingTop : style.paddingBottom) || 0;
}

/** The insets change when the device turns, which also resizes the window. */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/**
 * The height, in pixels, that the notch, status bar, or home indicator
 * takes from one edge of the screen; 0 where there is none, as on the desktop.
 */
export function useSafeAreaInset(side: Side): number {
  return useSyncExternalStore(
    subscribe,
    () => inset(side),
    () => 0,
  );
}
