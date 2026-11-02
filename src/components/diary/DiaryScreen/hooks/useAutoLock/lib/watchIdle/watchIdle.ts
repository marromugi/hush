/** What counts as someone being there. */
const ACTIVITY = ["keydown", "pointerdown", "pointermove", "wheel"] as const;

/**
 * Calls `onIdle` each time `idleMs` passes with no activity on `target`.
 * Activity starts the wait over. Returns a function that stops watching.
 */
export function watchIdle(target: EventTarget, idleMs: number, onIdle: () => void): () => void {
  let timer = setTimeout(fire, idleMs);

  function fire() {
    onIdle();
    timer = setTimeout(fire, idleMs);
  }

  function restart() {
    clearTimeout(timer);
    timer = setTimeout(fire, idleMs);
  }

  for (const type of ACTIVITY) target.addEventListener(type, restart, { passive: true });
  return () => {
    clearTimeout(timer);
    for (const type of ACTIVITY) target.removeEventListener(type, restart);
  };
}
