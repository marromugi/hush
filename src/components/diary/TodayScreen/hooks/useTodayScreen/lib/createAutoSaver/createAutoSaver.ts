export type Save = (body: string) => Promise<boolean>;

type Attempt = { body: string; save: Save };

export type AutoSaver = {
  /** Saves `body` with `save` once nothing newer has come for the delay. */
  schedule: (body: string, save: Save) => void;
  /**
   * Saves a waiting body now, or tries a failed one again. Resolves whether
   * the newest body is stored.
   */
  flush: () => Promise<boolean>;
  /** Drops a waiting body without saving it. */
  cancel: () => void;
};

/** Saves only the newest body, after typing has paused for `delayMs`. */
export function createAutoSaver(delayMs: number): AutoSaver {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let waiting: Attempt | undefined;
  /** The newest body, when saving it failed. */
  let failed: Attempt | undefined;
  let last: Promise<boolean> = Promise.resolve(true);

  function stopTimer() {
    clearTimeout(timer);
    timer = undefined;
  }

  function flush(): Promise<boolean> {
    stopTimer();
    const attempt = waiting ?? failed;
    if (attempt === undefined) return last;
    waiting = undefined;
    failed = undefined;
    const result = attempt.save(attempt.body);
    last = result;
    void result.then((saved) => {
      // An older body that failed must not be retried over a newer one.
      if (!saved && result === last && waiting === undefined) failed = attempt;
    });
    return result;
  }

  return {
    schedule(body, save) {
      waiting = { body, save };
      stopTimer();
      timer = setTimeout(() => void flush(), delayMs);
    },
    flush,
    cancel() {
      stopTimer();
      waiting = undefined;
      failed = undefined;
    },
  };
}
