import { expect, test } from "vitest";

import { parseAlign } from "./imageAlign";

test("centre and right are read as written", () => {
  expect(parseAlign("center")).toBe("center");
  expect(parseAlign("right")).toBe("right");
});

test("anything else sits on the left, as an image does when nothing is said", () => {
  for (const text of [null, "", "left", "middle", "Center"]) {
    expect(parseAlign(text)).toBe("left");
  }
});
