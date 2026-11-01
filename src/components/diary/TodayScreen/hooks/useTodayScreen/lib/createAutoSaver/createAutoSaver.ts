export type Save = (body: string) => Promise<boolean>;

export type AutoSaver = {
  /** Saves `body` with `save` once nothing newer has come for the delay. */
  schedule: (body: string, save: Save) => void;
  /** Saves a waiting body now. Resolves whether the newest body is stored. */
  flush: () => Promise<boolean>;
  /** Drops a waiting body without saving it. */
  cancel: () => void;
};

/** Saves only the newest body, after typing has paused for `delayMs`. */
export function createAutoSaver(delayMs: number): AutoSaver {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let waiting: { body: string; save: Save } | undefined;
  let last: Promise<boolean> = Promise.resolve(true);

  function stopTimer() {
    clearTimeout(timer);
    timer = undefined;
  }

  function flush(): Promise<boolean> {
    stopTimer();
    if (waiting !== undefined) {
      last = waiting.save(waiting.body);
      waiting = undefined;
    }
    return last;
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
    },
  };
}
