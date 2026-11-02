import { afterEach, expect, test } from "vitest";

import { loadFont } from "./fonts";

const realFonts = Object.getOwnPropertyDescriptor(document, "fonts");

afterEach(() => {
  document.head.innerHTML = "";
  if (realFonts) Object.defineProperty(document, "fonts", realFonts);
  else Reflect.deleteProperty(document, "fonts");
});

const klee = { id: "klee-one", family: "Klee One", category: "handwriting" };

/** Font loading that answers with `faces`, or fails when `faces` is an Error. */
function fakeFontLoading(faces: unknown[] | Error) {
  const asked: string[] = [];
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: {
      load: async (font: string) => {
        asked.push(font);
        if (faces instanceof Error) throw faces;
        return faces;
      },
    },
  });
  return asked;
}

const stylesheets = () => document.head.querySelectorAll('link[data-font="klee-one"]').length;

/** A stylesheet for the font already on the page, as after an earlier load. */
function alreadyAdded() {
  const link = document.createElement("link");
  link.dataset.font = "klee-one";
  document.head.append(link);
}

test("a stylesheet that cannot load is taken out again", async () => {
  // The test DOM refuses to load stylesheets, as an unreachable CDN would.
  fakeFontLoading([{}]);
  await expect(loadFont(klee, "https://cdn.example/klee.css")).rejects.toThrow(
    "font klee-one: stylesheet did not load",
  );
  expect(stylesheets()).toBe(0);
});

test("a stylesheet already on the page is not added again, and the font is fetched", async () => {
  const asked = fakeFontLoading([{}]);
  alreadyAdded();
  await loadFont(klee, "https://cdn.example/klee.css");
  expect(stylesheets()).toBe(1);
  expect(asked).toEqual(['1em "Klee One"']);
});

test("a font whose files cannot load leaves nothing behind, so the next try starts over", async () => {
  fakeFontLoading(new Error("network"));
  alreadyAdded();
  await expect(loadFont(klee, "https://cdn.example/klee.css")).rejects.toThrow("network");
  expect(stylesheets()).toBe(0);
});

test("a stylesheet that defines no face for the font is a failure", async () => {
  fakeFontLoading([]);
  alreadyAdded();
  await expect(loadFont(klee, "https://cdn.example/klee.css")).rejects.toThrow(
    "font klee-one: no face loaded",
  );
  expect(stylesheets()).toBe(0);
});
