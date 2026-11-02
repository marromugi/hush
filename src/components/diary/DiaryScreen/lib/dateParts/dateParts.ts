export type DateParts = { year: string; month: string; day: string };

/** `YYYY-MM-DD` as people read it: the month in two digits, the day without a leading zero. */
export function dateParts(date: string): DateParts {
  return {
    year: String(Number(date.slice(0, 4))),
    month: date.slice(5, 7),
    day: String(Number(date.slice(8, 10))),
  };
}
