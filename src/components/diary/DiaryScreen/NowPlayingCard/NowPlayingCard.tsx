import { clsx } from "clsx";

import type { NowPlaying } from "@/lib/vault/commands";

/** The song playing in the Music app: its album art, or its title when it has none. */
export function NowPlayingCard({ song }: { song: NowPlaying }) {
  const name = `${song.title} — ${song.artist}`;
  return (
    <figure title={name} aria-label={`再生中: ${name}`}>
      {song.artwork ? (
        <img
          src={song.artwork}
          alt=""
          className={clsx(
            // shape: a print laid on the desk, slightly askew
            "size-12 rotate-6 rounded-sm border-2 border-white object-cover",
            // color
            "shadow-float",
          )}
        />
      ) : (
        <figcaption className="max-w-40 truncate text-sm opacity-60">{song.title}</figcaption>
      )}
    </figure>
  );
}
