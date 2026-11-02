import { useRef, useState } from "react";

export type SingleFlight<A extends unknown[]> = {
  /** Runs the action, unless it is already running; then the call does nothing. */
  run: (...args: A) => Promise<void>;
  /** True while the action runs. */
  running: boolean;
};

/**
 * An async action that runs one at a time, as for a button pressed twice
 * before the first press is done. Whether it runs is checked against a ref,
 * so a second call in the same render is turned away too.
 */
export function useSingleFlight<A extends unknown[]>(
  action: (...args: A) => Promise<void>,
): SingleFlight<A> {
  const inFlight = useRef(false);
  const [running, setRunning] = useState(false);

  return {
    run: async (...args) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setRunning(true);
      try {
        await action(...args);
      } finally {
        inFlight.current = false;
        setRunning(false);
      }
    },
    running,
  };
}
