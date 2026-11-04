import { useSyncExternalStore } from "react";

type Side = "top" | "bottom";

/** How far the visible part of the page sits in from that edge of the window's layout, in pixels. */
function edge(side: Side): number {
  const vp = window.visualViewport;
  if (!vp) return 0;
  // Rounded, since the window's height is a whole number and the part in view's is not.
  if (side === "top") return Math.round(vp.offsetTop);
  return Math.max(0, Math.round(document.documentElement.clientHeight - vp.offsetTop - vp.height));
}

function subscribe(onChange: () => void): () => void {
  const vp = window.visualViewport;
  if (!vp) return () => {};
  vp.addEventListener("resize", onChange);
  vp.addEventListener("scroll", onChange);
  return () => {
    vp.removeEventListener("resize", onChange);
    vp.removeEventListener("scroll", onChange);
  };
}

/**
 * How much of the page the on-screen keyboard hides at the bottom, or has
 * pushed out of view at the top; 0 on both while the whole window shows,
 * as on the desktop. Sticky bands offset by these stay in view.
 */
export function useVisualViewportEdge(side: Side): number {
  return useSyncExternalStore(
    subscribe,
    () => edge(side),
    () => 0,
  );
}
