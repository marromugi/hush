import { expect, test } from "vitest";

import { axisOf, spreadOf, valueAt } from "./pinch";

test("the fingers' line picks the setting", () => {
  expect(axisOf(100, 10)).toBe("letterSpacing");
  expect(axisOf(10, 100)).toBe("lineHeight");
  expect(axisOf(100, 100)).toBe("size");
  expect(axisOf(-100, 90)).toBe("size");
});

test("the spread is measured along the setting's direction", () => {
  expect(spreadOf("letterSpacing", -30, 40)).toBe(30);
  expect(spreadOf("lineHeight", -30, 40)).toBe(40);
  expect(spreadOf("size", -30, 40)).toBe(50);
});

test("the boundaries between the settings sit at 30 and 60 degrees", () => {
  expect(axisOf(100, 57)).toBe("letterSpacing");
  expect(axisOf(100, 58)).toBe("size");
  expect(axisOf(57, 100)).toBe("lineHeight");
  expect(axisOf(58, 100)).toBe("size");
});

/** The value after the fingers went from 100px to `to` apart. */
const value = (axis: Parameters<typeof valueAt>[0], start: number, to: number) =>
  valueAt(axis, start, 100, to).value;

test("every 16px apart is one step", () => {
  expect(value("size", 18, 100)).toBe(18);
  expect(value("size", 18, 132)).toBe(20);
  expect(value("size", 18, 68)).toBe(16);
  expect(value("lineHeight", 1.6, 116)).toBe(1.7);
  expect(value("letterSpacing", 0, 148)).toBe(0.03);
});

test("past the end of the range, turning back changes the value at once", () => {
  // 18px to 24px takes 96px; the fingers went 300px, so the extra 204px no longer counts.
  const past = valueAt("size", 18, 100, 400);
  expect(past).toEqual({ value: 24, from: 304 });
  expect(valueAt("size", 18, past.from, 384).value).toBe(23);
  expect(valueAt("letterSpacing", 0, 100, 0)).toEqual({ value: 0, from: 0 });
});
