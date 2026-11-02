import { expect, test } from "vitest";

import { fitWithin } from "./shrinkImage";

test("a picture larger than the limit shrinks to it on its longer side, keeping its shape", () => {
  expect(fitWithin({ width: 4032, height: 3024 }, 2000)).toEqual({ width: 2000, height: 1500 });
  expect(fitWithin({ width: 1170, height: 2532 }, 2000)).toEqual({ width: 924, height: 2000 });
});

test("a picture within the limit keeps its size", () => {
  expect(fitWithin({ width: 800, height: 600 }, 2000)).toEqual({ width: 800, height: 600 });
});
