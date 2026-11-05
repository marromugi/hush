import { clsx } from "clsx";

import type { SavedPlaylist } from "@/lib/settings/settings";

import { usePlaylistButton } from "./usePlaylistButton";

/** The chosen playlist's artwork, or its name when it has none; pressing it plays the playlist shuffled. */
export function PlaylistButton({ playlist }: { playlist: SavedPlaylist }) {
  const button = usePlaylistButton(playlist);

  return (
    <button
      type="button"
      title={playlist.name}
      aria-label={`「${playlist.name}」を流す`}
      disabled={button.starting}
      onClick={button.play}
      className={clsx(
        // layout
        "cursor-pointer disabled:cursor-wait",
        // shape: a print laid on the desk, slightly askew
        "rotate-6 rounded-sm",
        // focus
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
        // motion: it lifts a little under the pointer
        "transition duration-160 ease-out hover:-translate-y-0.5 disabled:opacity-60",
      )}
    >
      {playlist.artwork ? (
        <img
          src={playlist.artwork}
          alt=""
          className={clsx(
            // shape
            "size-12 rounded-sm border-2 object-cover",
            // color: the frame is the raised surface's, white in light and dark grey in dark
            "border-surface-raised",
            // depth: a soft shadow under it and a tighter one at its edge, in the scheme's shadow color
            "shadow-[0_6px_16px_-4px_var(--shadow-float-color),0_1px_3px_var(--shadow-float-color)]",
          )}
        />
      ) : (
        <span className="block max-w-40 truncate text-sm opacity-60">{playlist.name}</span>
      )}
    </button>
  );
}
