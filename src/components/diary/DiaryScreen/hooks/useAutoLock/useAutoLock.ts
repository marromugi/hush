import { useEffect, useEffectEvent } from "react";

import { listenLockRequests } from "../../../../../lib/vault/commands";
import { watchIdle } from "./lib/watchIdle";

/** How long nothing may happen before the diary locks. */
const IDLE_MS = 5 * 60 * 1000;

/**
 * Locks when no one has touched the app for a while, and when the system
 * sleeps, locks the screen, or switches user. `lock` saves what is being
 * written first, as the lock in the menu does.
 */
export function useAutoLock(lock: () => Promise<void>): void {
  const lockNow = useEffectEvent(() => {
    void lock();
  });

  useEffect(() => watchIdle(window, IDLE_MS, () => lockNow()), []);

  useEffect(() => {
    let stopped = false;
    let unlisten: (() => void) | undefined;
    void listenLockRequests(() => lockNow()).then((stop) => {
      if (stopped) stop();
      else unlisten = stop;
    });
    return () => {
      stopped = true;
      unlisten?.();
    };
  }, []);
}
