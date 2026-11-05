import { expect, test } from "vitest";

import { weekdayBody } from "./weekdayBody";

test("gives the body each weekday's kanji names, from 日曜 to 土曜", () => {
  expect(
    [
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ].map(weekdayBody),
  ).toEqual(["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]);
});
