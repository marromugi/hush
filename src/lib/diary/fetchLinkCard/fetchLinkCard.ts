import type { EntryHost } from "@/lib/diary/entryHost";
import { preparePicture } from "@/lib/diary/preparePicture";

import { pictureType } from "./pictureType";

/** What a card keeps of the page its link points at. */
export type LinkCardContent = {
  /** `null` when the page names no title. */
  title: string | null;
  /** The id the page's picture was saved as; `null` when it has none, or it could not be saved. */
  image: string | null;
};

/**
 * Reads, through `host`, the page `url` points at, and saves its picture as
 * an encrypted image like a pasted one, so the card is shown without going
 * back to the site. A picture that cannot be fetched or read leaves the card
 * without one. Rejects when the page itself cannot be read.
 */
export async function fetchLinkCard(host: EntryHost, url: string): Promise<LinkCardContent> {
  const page = await host.linkPage(url);
  if (page.imageUrl === null) return { title: page.title, image: null };
  try {
    const bytes = await host.linkImage(page.imageUrl);
    const picture = await preparePicture(new Blob([bytes], { type: pictureType(bytes) }));
    return { title: page.title, image: await host.saveImage(picture) };
  } catch {
    return { title: page.title, image: null };
  }
}
