import { afterEach, expect, test, vi } from "vitest";

import { fontStack, listFonts, pickFont, stylesheetUrl } from "./fonts";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A fetch that answers each URL with its JSON, and records what was asked. */
function fakeFetch(answers: Record<string, unknown>) {
  const asked: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    asked.push(url);
    return url in answers
      ? new Response(JSON.stringify(answers[url]))
      : new Response("not found", { status: 404 });
  });
  return asked;
}

test("lists the Google fonts that have the subset's characters, leaving out icon fonts", async () => {
  fakeFetch({
    "https://api.fontsource.org/v1/fonts?subsets=japanese": [
      { id: "noto-sans-jp", family: "Noto Sans JP", category: "sans-serif", type: "google" },
      { id: "material-icons", family: "Material Icons", category: "icons", type: "google" },
      { id: "some-other", family: "Some Other", category: "serif", type: "other" },
    ],
  });
  expect(await listFonts("japanese")).toEqual([
    { id: "noto-sans-jp", family: "Noto Sans JP", category: "sans-serif" },
  ]);
});

test("a font's stylesheet is pinned to its current version", async () => {
  fakeFetch({ "https://api.fontsource.org/v1/fonts/noto-sans-jp": { npmVersion: "5.3.1" } });
  expect(await stylesheetUrl("noto-sans-jp")).toBe(
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.3.1/index.css",
  );
});

test("a failed answer is an error, not an empty list", async () => {
  fakeFetch({});
  await expect(listFonts("japanese")).rejects.toThrow("font list: 404");
  await expect(stylesheetUrl("noto-sans-jp")).rejects.toThrow("font noto-sans-jp: 404");
});

test("an answer of another shape is an error", async () => {
  fakeFetch({ "https://api.fontsource.org/v1/fonts/noto-sans-jp": { version: "v57" } });
  await expect(stylesheetUrl("noto-sans-jp")).rejects.toThrow("npmVersion");
});

const fonts = [
  { id: "a", family: "A", category: "serif" },
  { id: "b", family: "B", category: "sans-serif" },
];

test("picks a font other than the current one", () => {
  expect(pickFont(fonts, fonts[0], () => 0)).toEqual(fonts[1]);
  expect(pickFont(fonts, fonts[1], () => 0.99)).toEqual(fonts[0]);
  expect(pickFont([fonts[0]], fonts[0])).toBeNull();
});

test("falls back to the font's kind while it loads", () => {
  expect(fontStack({ id: "a", family: "Klee One", category: "handwriting" })).toBe(
    '"Klee One", cursive',
  );
  expect(fontStack({ id: "b", family: "Dela Gothic One", category: "display" })).toBe(
    '"Dela Gothic One", sans-serif',
  );
  expect(fontStack({ id: "c", family: "Shippori Mincho", category: "serif" })).toBe(
    '"Shippori Mincho", serif',
  );
  expect(fontStack({ id: "d", family: "M PLUS 1 Code", category: "monospace" })).toBe(
    '"M PLUS 1 Code", monospace',
  );
});
