import { expect, test } from "vitest";

import { calendarOf } from "./calendarOf";

test("groups dates by year and month, newest year first", () => {
  expect(calendarOf(["2021-03-05", "2022-04-13", "2022-12-01", "2022-12-18"])).toEqual([
    {
      year: "2022",
      months: [
        {
          month: "2022-04",
          label: "4",
          title: "2022.4",
          days: [{ date: "2022-04-13", label: "13" }],
        },
        {
          month: "2022-12",
          label: "12",
          title: "2022.12",
          days: [
            { date: "2022-12-01", label: "1" },
            { date: "2022-12-18", label: "18" },
          ],
        },
      ],
    },
    {
      year: "2021",
      months: [
        {
          month: "2021-03",
          label: "3",
          title: "2021.3",
          days: [{ date: "2021-03-05", label: "5" }],
        },
      ],
    },
  ]);
});
