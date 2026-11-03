import { expect, test } from "vitest";

import { grownWidth, parseWidth } from "./imageWidth";

test("a written width is read as a whole percent", () => {
  expect(parseWidth("60")).toBe(60);
  expect(parseWidth("100")).toBe(100);
  expect(parseWidth("10")).toBe(10);
});

test("a missing or unusable width leaves the image at its own size", () => {
  for (const text of [null, "", "5", "101", "60.5", "-20", "60%", "abc"]) {
    expect(parseWidth(text)).toBeNull();
  }
});

test("a grown or shrunk image's width is its new size in percent of the column", () => {
  expect(grownWidth(200, 100, 600)).toBe(50);
  expect(grownWidth(300, -99, 600)).toBe(34);
});

test("growing or shrinking past either end stops at the narrowest or the full width", () => {
  expect(grownWidth(200, -190, 600)).toBe(10);
  expect(grownWidth(200, 2000, 600)).toBe(100);
});
