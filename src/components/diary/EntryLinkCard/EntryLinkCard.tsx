import { clsx } from "clsx";

import { linkDomain, linkLabel } from "@/lib/diary/linkCard";

import { LinkCardImage } from "./LinkCardImage";
import type { EntryLinkCardProps } from "./type";

/**
 * A link in an entry, shown as a card: the page's picture fills it, and its
 * title and site sit small at the bottom, over a shade that keeps them
 * readable on any picture.
 */
export function EntryLinkCard({
  url,
  title,
  image,
  loading = false,
  selected = false,
}: EntryLinkCardProps) {
  return (
    <div
      className={clsx(
        // layout
        "not-prose relative",
        // size: the shape Open Graph pictures are made in
        "aspect-[1.91/1] max-w-[550px]",
        // spacing
        "my-[1em]",
        // shape
        "overflow-hidden rounded-lg",
        // color
        "bg-current/10",
        // motion
        loading && "animate-pulse",
        // focus
        selected && "outline-2 outline-offset-2 outline-current/40",
      )}
    >
      {image === null ? null : <LinkCardImage id={image} />}
      <div
        className={clsx(
          // layout
          "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3",
          // spacing
          "px-3 pt-12 pb-2.5",
          // typography
          "text-xs leading-snug",
          // color
          "bg-linear-to-t from-black/75 to-transparent text-white",
        )}
      >
        <span className="line-clamp-2 min-w-0">{title ?? linkLabel(url)}</span>
        <span className="shrink-0 text-white/70">{linkDomain(url)}</span>
      </div>
    </div>
  );
}
