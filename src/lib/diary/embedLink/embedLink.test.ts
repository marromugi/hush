import { expect, test } from "vitest";

import { embedFrameSrc, parseEmbed, parseEmbedLink } from "./embedLink";

test.each([
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
  "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://youtu.be/dQw4w9WgXcQ?si=abc",
  "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  "https://www.youtube.com/live/dQw4w9WgXcQ",
  "  https://www.youtube.com/watch?v=dQw4w9WgXcQ\n",
])("a YouTube video link is read as that video: %s", (link) => {
  expect(parseEmbedLink(link)).toEqual({ site: "youtube", id: "dQw4w9WgXcQ" });
});

test.each([
  "https://x.com/someone/status/1234567890123456789",
  "https://twitter.com/someone/status/1234567890123456789?s=20",
  "https://mobile.twitter.com/someone/status/1234567890123456789",
  "https://x.com/i/web/status/1234567890123456789",
  "https://x.com/someone/status/1234567890123456789/photo/1",
])("a post on X is read as that post: %s", (link) => {
  expect(parseEmbedLink(link)).toEqual({ site: "x", id: "1234567890123456789" });
});

test.each([
  "https://www.youtube.com/",
  "https://www.youtube.com/watch?v=short",
  "https://www.youtube.com/@channel",
  "https://x.com/someone",
  "https://x.com/someone/status/abc",
  "https://example.com/watch?v=dQw4w9WgXcQ",
  "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
  "javascript://youtu.be/dQw4w9WgXcQ",
  "see https://youtu.be/dQw4w9WgXcQ",
  "youtu.be/dQw4w9WgXcQ",
])("anything else is not shown as an embed: %s", (text) => {
  expect(parseEmbedLink(text)).toBeNull();
});

test("an embed written in an entry is shown only for a known site and a valid id", () => {
  expect(parseEmbed("youtube", "dQw4w9WgXcQ")).toEqual({ site: "youtube", id: "dQw4w9WgXcQ" });
  expect(parseEmbed("x", "123")).toEqual({ site: "x", id: "123" });
  expect(parseEmbed("x", "123&evil=1")).toBeNull();
  expect(parseEmbed("vimeo", "123")).toBeNull();
  expect(parseEmbed(null, "123")).toBeNull();
});

test("a video is shown from the page served on this machine, or YouTube's own without one", () => {
  const video = { site: "youtube", id: "dQw4w9WgXcQ" } as const;
  expect(embedFrameSrc(video, "dark", "http://127.0.0.1:5123")).toBe(
    "http://127.0.0.1:5123/youtube/dQw4w9WgXcQ",
  );
  expect(embedFrameSrc(video, "dark", null)).toBe(
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
});

test("a post is shown from X's page in the theme asked", () => {
  expect(embedFrameSrc({ site: "x", id: "20" }, "dark", "http://127.0.0.1:5123")).toBe(
    "https://platform.twitter.com/embed/Tweet.html?id=20&dnt=true&theme=dark&lang=ja",
  );
});
