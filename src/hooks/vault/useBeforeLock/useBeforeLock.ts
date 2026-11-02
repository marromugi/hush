import { useEffect, useRef } from "react";

import { useSession } from "../useSession";
import type { BeforeLock } from "../useSession";

/**
 * Makes the vault wait for `work` before it locks, for as long as the
 * calling component is on screen. The newest `work` is the one run.
 */
export function useBeforeLock(work: BeforeLock): void {
  const { addBeforeLock } = useSession();
  const latest = useRef(work);
  useEffect(() => {
    latest.current = work;
  });
  useEffect(() => addBeforeLock(() => latest.current()), [addBeforeLock]);
}
