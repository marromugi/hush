import { useEffect, useEffectEvent } from "react";

import { listenLockRequests } from "../../../../../lib/vault/commands";
import { watchIdle } from "./lib/watchIdle";

/** How long nothing may happen before the diary locks. */
const IDLE_MS = 5 * 60 * 1000;

/**
 * Locks when no one has touched the app for a while, and when the system
 * sleeps or locks the screen. Use it on every screen shown while unlocked;
 * `lock` saves anything still being written before it locks.
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
