import { clsx } from "clsx";

import type { EntryEmbedProps } from "./type";
import { useEmbedFrame } from "./useEmbedFrame";

const TITLE = { youtube: "YouTube の動画", x: "X の投稿" } as const;

/** A YouTube video or a post on X in an entry, shown by the site itself as the entry is opened. */
export function EntryEmbed({ embed, selected = false }: EntryEmbedProps) {
  const { ref, src, height } = useEmbedFrame(embed);

  return (
    <div
      className={clsx(
        // size
        embed.site === "x" && "max-w-[550px]",
        // spacing
        "my-[1em]",
        // shape: a post on X draws its own border and corners
        embed.site === "youtube" && "overflow-hidden rounded-lg",
        // focus
        selected && "outline-2 outline-offset-2 outline-current/40",
      )}
    >
      <iframe
        ref={ref}
        src={src}
        title={TITLE[embed.site]}
        // Kept off Hush's own page.
        // oxlint-disable-next-line react/iframe-missing-sandbox -- the page is another site's, so its own origin cannot reach Hush's
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={height === null ? undefined : { height }}
        className={clsx(
          // size
          "block w-full",
          embed.site === "youtube" && "aspect-video",
          // Room for the post while it is read, so the text below does not jump twice.
          embed.site === "x" && height === null && "h-48",
          // shape
          "border-0",
        )}
      />
    </div>
  );
}
