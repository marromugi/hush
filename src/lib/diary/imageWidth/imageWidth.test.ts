import { expect, test } from "vitest";

import { parseWidth, widthAt } from "./imageWidth";

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

test("dragging gives the width from the image's left edge to the pointer", () => {
  expect(widthAt(400, 100, 600)).toBe(50);
  expect(widthAt(301, 100, 600)).toBe(34);
});

test("dragging past either end stops at the narrowest or the full width", () => {
  expect(widthAt(110, 100, 600)).toBe(10);
  expect(widthAt(2000, 100, 600)).toBe(100);
});
