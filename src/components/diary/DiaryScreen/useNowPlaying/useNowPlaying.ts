import { useEffect, useState } from "react";

import { listenNowPlaying, nowPlaying } from "@/lib/vault/commands";
import type { NowPlaying } from "@/lib/vault/commands";

/**
 * The song the Music app plays, kept current as it changes; null while
 * nothing plays, and where the platform cannot tell.
 */
export function useNowPlaying(): NowPlaying | null {
  const [song, setSong] = useState<NowPlaying | null>(null);

  useEffect(() => {
    let stopped = false;
    // Once a change has come, the answer to the first question is older than it.
    let changed = false;
    let unlisten: (() => void) | undefined;
    void listenNowPlaying((next) => {
      changed = true;
      setSong(next);
    }).then((stop) => {
      if (stopped) stop();
      else unlisten = stop;
    });
    nowPlaying()
      .then((first) => {
        if (!stopped && !changed) setSong(first);
      })
      // Nothing is shown when it cannot be told.
      .catch(() => {});
    return () => {
      stopped = true;
      unlisten?.();
    };
  }, []);

  return song;
}
