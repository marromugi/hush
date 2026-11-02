import { useEffect, useEffectEvent, useState } from "react";

export type PromiseState<T> =
  | { status: "loading" }
  | { status: "done"; value: T }
  | { status: "failed"; error: unknown };

/**
 * Runs `load` when the component mounts and again whenever `key` changes,
 * and gives what it settled to. A result for an old `key`, or one that comes
 * after the component is gone, is dropped. Until the result for the current
 * `key` arrives, it is `loading`.
 */
export function usePromise<T>(load: () => Promise<T>, key: unknown = null): PromiseState<T> {
  const [settled, setSettled] = useState<{ key: unknown; state: PromiseState<T> } | null>(null);
  const start = useEffectEvent(load);

  useEffect(() => {
    let ignore = false;
    start().then(
      (value) => {
        if (!ignore) setSettled({ key, state: { status: "done", value } });
      },
      (error: unknown) => {
        if (!ignore) setSettled({ key, state: { status: "failed", error } });
      },
    );
    return () => {
      ignore = true;
    };
  }, [key]);

  return settled !== null && Object.is(settled.key, key) ? settled.state : { status: "loading" };
}
