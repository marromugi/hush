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
    // Asked only once listening, so no change can slip in between.
    void listenNowPlaying((next) => {
      changed = true;
      setSong(next);
    })
      .then(async (stop) => {
        if (stopped) {
          stop();
          return;
        }
        unlisten = stop;
        const first = await nowPlaying();
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
