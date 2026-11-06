import { expect, test } from "vitest";

import { fakeEntryHost } from "@/lib/diary/fakeEntryHost";
import { HushError } from "@/lib/vault/hushError";

import { fetchLinkCard } from "./fetchLinkCard";

test("a page with no picture gives its title and fetches nothing more", async () => {
  const calls: string[] = [];
  const host = fakeEntryHost({
    linkPage: async () => {
      calls.push("linkPage");
      return { title: "海の記事", imageUrl: null };
    },
    linkImage: async () => {
      calls.push("linkImage");
      return new ArrayBuffer(0);
    },
    saveImage: async () => {
      calls.push("saveImage");
      return "0123456789abcdef0123456789abcdef";
    },
  });
  await expect(fetchLinkCard(host, "https://example.com/")).resolves.toEqual({
    title: "海の記事",
    image: null,
  });
  expect(calls).toEqual(["linkPage"]);
});

test("a picture that cannot be fetched leaves the card without one", async () => {
  const calls: string[] = [];
  const host = fakeEntryHost({
    linkPage: async () => {
      calls.push("linkPage");
      return { title: "海", imageUrl: "https://example.com/a.jpg" };
    },
    linkImage: async () => {
      calls.push("linkImage");
      throw new HushError("link", "link could not be fetched");
    },
    saveImage: async () => {
      calls.push("saveImage");
      return "0123456789abcdef0123456789abcdef";
    },
  });
  await expect(fetchLinkCard(host, "https://example.com/")).resolves.toEqual({
    title: "海",
    image: null,
  });
  expect(calls).not.toContain("saveImage");
});

test("a page that cannot be read is rejected", async () => {
  const host = fakeEntryHost({
    linkPage: () => Promise.reject(new HushError("link", "link could not be fetched")),
  });
  await expect(fetchLinkCard(host, "https://example.com/")).rejects.toMatchObject({
    kind: "link",
  });
});
