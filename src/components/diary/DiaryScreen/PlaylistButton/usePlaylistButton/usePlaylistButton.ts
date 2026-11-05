import { useState } from "react";

import type { SavedPlaylist } from "@/lib/settings/settings";
import { toastError } from "@/lib/ui/toast";
import { playPlaylist } from "@/lib/vault/commands";
import { failureText } from "@/lib/vault/errorText";

export type UsePlaylistButton = {
  /** True from the press until the Music app has started, so a second press waits. */
  starting: boolean;
  play: () => void;
};

export function usePlaylistButton(playlist: SavedPlaylist): UsePlaylistButton {
  const [starting, setStarting] = useState(false);
  return {
    starting,
    play: () => {
      setStarting(true);
      void playPlaylist(playlist.id)
        .catch((failure: unknown) => toastError(failureText(failure)))
        .finally(() => setStarting(false));
    },
  };
}
