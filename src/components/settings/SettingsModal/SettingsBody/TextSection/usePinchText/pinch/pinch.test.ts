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

test("every 16px apart is one step, kept inside the range", () => {
  expect(valueAt("size", 18, 100, 100)).toBe(18);
  expect(valueAt("size", 18, 100, 132)).toBe(20);
  expect(valueAt("size", 18, 100, 68)).toBe(16);
  expect(valueAt("size", 18, 100, 1000)).toBe(24);
  expect(valueAt("letterSpacing", 0, 100, 0)).toBe(0);
  expect(valueAt("lineHeight", 1.6, 100, 116)).toBe(1.7);
  expect(valueAt("letterSpacing", 0, 100, 148)).toBe(0.03);
});
