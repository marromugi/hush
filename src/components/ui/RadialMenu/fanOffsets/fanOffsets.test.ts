import { expect, test } from "vitest";

import { fanOffsets } from "./fanOffsets";

test("a single item sits straight above the trigger", () => {
  expect(fanOffsets(1, 56, 45)).toEqual([{ x: 0, y: -56 }]);
});

test("items spread left to right on the arc, a step apart, mirrored around straight up", () => {
  expect(fanOffsets(3, 56, 45)).toEqual([
    { x: -39.6, y: -39.6 },
    { x: 0, y: -56 },
    { x: 39.6, y: -39.6 },
  ]);
});
