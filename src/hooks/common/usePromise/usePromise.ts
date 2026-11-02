import { useEffect, useEffectEvent, useState } from "react";

export type PromiseState<T> =
  | { status: "loading" }
  | { status: "done"; value: T }
  | { status: "failed"; error: unknown };

/**
 * Runs `load` when the component mounts and again whenever `key` changes
 * (a string, compared by value, so a new `load` each render does not reload),
 * and gives what it settled to. A result for an old `key`, or one that comes
 * after the component is gone, is dropped. Until the result for the current
 * `key` arrives, it is `loading`. `onFailure` hears of a failure that is kept,
 * once, as when it should be told to the person.
 */
export function usePromise<T>(
  load: () => Promise<T>,
  key: string | null = null,
  onFailure?: (error: unknown) => void,
): PromiseState<T> {
  const [settled, setSettled] = useState<{ key: string | null; state: PromiseState<T> } | null>(
    null,
  );
  const start = useEffectEvent(load);
  const fail = useEffectEvent((error: unknown) => onFailure?.(error));

  useEffect(() => {
    let ignore = false;
    start().then(
      (value) => {
        if (!ignore) setSettled({ key, state: { status: "done", value } });
      },
      (error: unknown) => {
        if (ignore) return;
        setSettled({ key, state: { status: "failed", error } });
        fail(error);
      },
    );
    return () => {
      ignore = true;
    };
  }, [key]);

  return settled !== null && settled.key === key ? settled.state : { status: "loading" };
}
