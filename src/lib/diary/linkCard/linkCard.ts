import { parseEmbedLink } from "@/lib/diary/embedLink";

/**
 * The link to make a card of, from text pasted on its own: one `http` or
 * `https` link that is not a YouTube video or a post on X, which are shown
 * as embeds instead. `null` for anything else.
 */
export function parseCardLink(text: string): string | null {
  const trimmed = text.trim();
  if (/\s/.test(trimmed) || parseEmbedLink(trimmed)) return null;
  return parseCardUrl(trimmed);
}

/** The card's link as written in an entry's HTML; `null` unless it is an `http` or `https` URL. */
export function parseCardUrl(text: string | null): string | null {
  if (text === null) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
}

/** The site a card's link is on, as shown on the card: `example.com` from `https://www.example.com/a`. */
export function linkDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

/** What a card shows as its title when the page named none: the link without `https://`. */
export function linkLabel(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
