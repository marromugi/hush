import { expect, test } from "vitest";

import { linkDomain, linkLabel, parseCardLink, parseCardUrl } from "./linkCard";

test("one web link pasted on its own is made a card", () => {
  expect(parseCardLink("  https://example.com/a?b=1\n")).toBe("https://example.com/a?b=1");
  expect(parseCardLink("http://example.com")).toBe("http://example.com/");
});

test("text that is not one web link is not made a card", () => {
  for (const text of [
    "",
    "見て https://example.com",
    "example.com",
    "file:///etc/hosts",
    "mailto:a@b.c",
  ]) {
    expect(parseCardLink(text)).toBeNull();
  }
});

test("a YouTube or X link is left to the embed", () => {
  expect(parseCardLink("https://youtu.be/dQw4w9WgXcQ")).toBeNull();
  expect(parseCardLink("https://x.com/jack/status/20")).toBeNull();
  // A link to the site that is not a video or a post is still a card.
  expect(parseCardLink("https://www.youtube.com/@channel")).toBe(
    "https://www.youtube.com/@channel",
  );
});

test("a link read from an entry's HTML is kept only when it is a web link", () => {
  expect(parseCardUrl("https://example.com/")).toBe("https://example.com/");
  expect(parseCardUrl("javascript:alert(1)")).toBeNull();
  expect(parseCardUrl(null)).toBeNull();
});

test("the card names the site without www", () => {
  expect(linkDomain("https://www.example.com/a")).toBe("example.com");
  expect(linkDomain("https://blog.example.com/a")).toBe("blog.example.com");
});

test("a page with no title is named by its link", () => {
  expect(linkLabel("https://example.com/")).toBe("example.com");
  expect(linkLabel("https://example.com/a/b")).toBe("example.com/a/b");
});
