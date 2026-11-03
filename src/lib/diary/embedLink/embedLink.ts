/** A post from another site shown inside an entry: a YouTube video or a post on X. */
export type EmbedLink = { site: "youtube" | "x"; id: string };

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"];
const X_HOSTS = ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"];

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const X_ID = /^[0-9]{1,20}$/;

/**
 * The video or post a link points at, read from a link copied from the
 * browser: `https://www.youtube.com/watch?v=…`, `https://youtu.be/…`,
 * `https://x.com/…/status/…`. `null` for any other link, or text that is not
 * one link.
 */
export function parseEmbedLink(text: string): EmbedLink | null {
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.hostname === "youtu.be") return youtube(parts[0]);
  if (YOUTUBE_HOSTS.includes(url.hostname)) {
    if (parts[0] === "watch") return youtube(url.searchParams.get("v"));
    if (parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed") {
      return youtube(parts[1]);
    }
    return null;
  }
  if (X_HOSTS.includes(url.hostname)) {
    // `/user/status/123` and `/i/web/status/123` both name the post by its number.
    const status = parts.indexOf("status");
    return status > 0 ? x(parts[status + 1]) : null;
  }
  return null;
}

/** The embed written in an entry's HTML; `null` when the site or id is not one that can be shown. */
export function parseEmbed(site: string | null, id: string | null): EmbedLink | null {
  if (site === "youtube") return youtube(id);
  if (site === "x") return x(id);
  return null;
}

/**
 * The page that shows the embed. A YouTube video is shown in a page served
 * from `pagesOrigin` on this machine, which embeds YouTube's page that keeps
 * no cookies until the video is played: YouTube plays only inside a page it
 * can name. Without `pagesOrigin`, YouTube's page is used as it is. X's page
 * is told not to use what it shows for tracking, and drawn in `theme`.
 */
export function embedFrameSrc(
  embed: EmbedLink,
  theme: "light" | "dark",
  pagesOrigin: string | null,
): string {
  if (embed.site === "youtube") {
    return pagesOrigin === null
      ? `https://www.youtube-nocookie.com/embed/${embed.id}`
      : `${pagesOrigin}/youtube/${embed.id}`;
  }
  return `https://platform.twitter.com/embed/Tweet.html?id=${embed.id}&dnt=true&theme=${theme}&lang=ja`;
}

function youtube(id: string | null | undefined): EmbedLink | null {
  return id && YOUTUBE_ID.test(id) ? { site: "youtube", id } : null;
}

function x(id: string | null | undefined): EmbedLink | null {
  return id && X_ID.test(id) ? { site: "x", id } : null;
}
