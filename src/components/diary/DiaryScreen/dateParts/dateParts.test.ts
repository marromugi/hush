import { expect, test } from "vitest";

import { dateParts } from "./dateParts";

test("splits a date into the numbers people read, without leading zeros", () => {
  expect(dateParts("2026-01-02")).toEqual({ year: "2026", month: "1", day: "2" });
  expect(dateParts("2020-12-20")).toEqual({ year: "2020", month: "12", day: "20" });
});
