import { afterAll, beforeAll, expect, test } from "vitest";

import { localDate } from "./localDate";

// Fixed so the test means the same on any machine, including UTC CI runners.
const originalTimeZone = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Asia/Tokyo";
});
afterAll(() => {
  // Assigning undefined would set the string "undefined", an invalid zone.
  if (originalTimeZone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = originalTimeZone;
  }
});

test("pads month and day", () => {
  expect(localDate(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
});

test("uses the local day while UTC is still on the previous day", () => {
  // 00:30 in Tokyo is 15:30 the day before in UTC.
  const now = new Date(2026, 9, 30, 0, 30);
  expect(now.getUTCDate()).toBe(29);
  expect(localDate(now)).toBe("2026-10-30");
});
