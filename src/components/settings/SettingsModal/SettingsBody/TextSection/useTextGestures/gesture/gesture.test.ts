import { expect, test } from "vitest";

import { dragAxis, dragDistance, valueAt } from "./gesture";

test("a drag across changes the letters, up and down the lines", () => {
  expect(dragAxis(20, 5)).toBe("letterSpacing");
  expect(dragAxis(-20, 19)).toBe("letterSpacing");
  expect(dragAxis(5, -20)).toBe("lineHeight");
});

test("right and down count up", () => {
  expect(dragDistance("letterSpacing", 30, -40)).toBe(30);
  expect(dragDistance("letterSpacing", -30, 40)).toBe(-30);
  expect(dragDistance("lineHeight", 30, -40)).toBe(-40);
  expect(dragDistance("lineHeight", -30, 40)).toBe(40);
});

/** The value after the finger went from 100px to `to`. */
const value = (axis: Parameters<typeof valueAt>[0], start: number, to: number) =>
  valueAt(axis, start, 100, to).value;

test("only a whole 16px is a step, the same both ways", () => {
  expect(value("lineHeight", 1.6, 109)).toBe(1.6);
  expect(value("lineHeight", 1.6, 91)).toBe(1.6);
  expect(value("lineHeight", 1.6, 116)).toBe(1.7);
  expect(value("lineHeight", 1.6, 84)).toBe(1.5);
  expect(value("lineHeight", 1.6, 131)).toBe(1.7);
});

test("every 16px is one step", () => {
  expect(value("size", 18, 100)).toBe(18);
  expect(value("size", 18, 132)).toBe(20);
  expect(value("size", 18, 68)).toBe(16);
  expect(value("lineHeight", 1.6, 116)).toBe(1.7);
  expect(value("letterSpacing", 0, 148)).toBe(0.03);
});

test("past the end of the range, turning back changes the value at once", () => {
  // 18px to 24px takes 96px; the finger went 300px, so the extra 204px no longer counts.
  const past = valueAt("size", 18, 100, 400);
  expect(past).toEqual({ value: 24, from: 304 });
  expect(valueAt("size", 18, past.from, 400).value).toBe(24);
  expect(valueAt("size", 18, past.from, 399).value).toBe(23);
  expect(valueAt("letterSpacing", 0, 100, 0)).toEqual({ value: 0, from: 0 });
});
