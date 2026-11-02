import { useCallback, useRef, useState } from "react";

import type { BeforeLock, Session } from "../../../../../hooks/vault/useSession";

/** The session's lock: registered work first, then `onLock` if all of it succeeded. */
export function useLockFlow(onLock: () => Promise<void>): Session {
  const [beforeLock] = useState(() => new Set<BeforeLock>());
  const [locking, setLocking] = useState(false);
  const running = useRef<Promise<void> | null>(null);

  const addBeforeLock = useCallback(
    (work: BeforeLock) => {
      beforeLock.add(work);
      return () => {
        beforeLock.delete(work);
      };
    },
    [beforeLock],
  );

  return {
    lock: () => {
      // Sleep and screen lock come together; the second call joins the first.
      running.current ??= (async () => {
        setLocking(true);
        try {
          const done = await Promise.all([...beforeLock].map((work) => work()));
          if (done.every(Boolean)) await onLock();
        } finally {
          setLocking(false);
          running.current = null;
        }
      })();
      return running.current;
    },
    locking,
    addBeforeLock,
  };
}
