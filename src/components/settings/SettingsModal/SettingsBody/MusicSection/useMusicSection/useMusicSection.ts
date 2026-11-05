import { useEffect, useState } from "react";

import { useSettings } from "@/hooks/settings/useSettings";
import { writeSettings } from "@/lib/settings/settings";
import type { SavedPlaylist } from "@/lib/settings/settings";
import { toastError } from "@/lib/ui/toast";
import { musicPlaylists, playlistArtwork } from "@/lib/vault/commands";
import type { Playlist, Playlists } from "@/lib/vault/commands";
import { failureText } from "@/lib/vault/errorText";

export type UseMusicSection = {
  /** `null` until the Music app has answered; `failed` when asking it went wrong. */
  playlists: Playlists | { status: "failed" } | null;
  /** The playlist the diary screen plays on this device. */
  chosen: SavedPlaylist | null;
  /** The chosen playlist when the Music app no longer lists it, so it can still be seen as chosen. */
  missing: SavedPlaylist | null;
  /** True while the chosen playlist's artwork is being read. */
  busy: boolean;
  /** `null` plays nothing. Takes effect at once, on this device only. */
  choose: (playlist: Playlist | null) => void;
};

export function useMusicSection(): UseMusicSection {
  const { playlist: chosen } = useSettings();
  const [playlists, setPlaylists] = useState<UseMusicSection["playlists"]>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    void musicPlaylists().then(
      (found) => {
        if (!ignore) setPlaylists(found);
      },
      (failure: unknown) => {
        if (ignore) return;
        setPlaylists({ status: "failed" });
        toastError(failureText(failure));
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  const missing =
    chosen !== null &&
    playlists?.status === "listed" &&
    !playlists.playlists.some((playlist) => playlist.id === chosen.id)
      ? chosen
      : null;

  return {
    playlists,
    chosen,
    missing,
    busy,
    choose: (playlist) => {
      if (playlist === null) {
        writeSettings({ playlist: null });
        return;
      }
      setBusy(true);
      // Without its artwork the playlist still plays; its name stands in.
      void playlistArtwork(playlist.id)
        .catch(() => null)
        .then((artwork) => writeSettings({ playlist: { ...playlist, artwork } }))
        .finally(() => setBusy(false));
    },
  };
}
