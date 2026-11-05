import { expect, test } from "vitest";

import { fanOffsets } from "./fanOffsets";

test("a single item sits straight above the trigger", () => {
  expect(fanOffsets(1, 56, 45)).toEqual([{ x: 0, y: -56 }]);
});

test("items spread left to right, mirrored around straight up", () => {
  const [left, middle, right] = fanOffsets(3, 56, 45);
  expect(left.x).toBeLessThan(0);
  expect(middle).toEqual({ x: 0, y: -56 });
  expect(right).toEqual({ x: -left.x, y: left.y });
  expect(Math.hypot(left.x, left.y)).toBeCloseTo(56, 1);
});

test("no items, no offsets", () => {
  expect(fanOffsets(0, 56, 45)).toEqual([]);
});
