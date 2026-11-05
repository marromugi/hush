import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, expect, test } from "vitest";

import { fetchLinkCard } from "./fetchLinkCard";

afterEach(() => {
  clearMocks();
});

test("a page with no picture gives its title and fetches nothing more", async () => {
  const calls: string[] = [];
  mockIPC((command) => {
    calls.push(command);
    if (command === "link_page") return { title: "海の記事", imageUrl: null };
    throw new Error(`unexpected ${command}`);
  });
  await expect(fetchLinkCard("https://example.com/")).resolves.toEqual({
    title: "海の記事",
    image: null,
  });
  expect(calls).toEqual(["link_page"]);
});

test("a picture that cannot be fetched leaves the card without one", async () => {
  const calls: string[] = [];
  mockIPC((command) => {
    calls.push(command);
    if (command === "link_page") return { title: "海", imageUrl: "https://example.com/a.jpg" };
    throw { kind: "link", message: "link could not be fetched" };
  });
  await expect(fetchLinkCard("https://example.com/")).resolves.toEqual({
    title: "海",
    image: null,
  });
  expect(calls).not.toContain("save_image");
});

test("a page that cannot be read is rejected", async () => {
  mockIPC(() => {
    throw { kind: "link", message: "link could not be fetched" };
  });
  await expect(fetchLinkCard("https://example.com/")).rejects.toMatchObject({ kind: "link" });
});
