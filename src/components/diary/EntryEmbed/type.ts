import type { EmbedLink } from "@/lib/diary/embedLink";

export type EntryEmbedProps = {
  /** The video or post to show. */
  embed: EmbedLink;
  /** True while the embed is the editor's selection. */
  selected?: boolean;
};
