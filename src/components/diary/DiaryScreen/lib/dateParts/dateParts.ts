export type DateParts = { year: string; month: string; day: string };

/** `YYYY-MM-DD` as the numbers people read, without leading zeros. */
export function dateParts(date: string): DateParts {
  return {
    year: String(Number(date.slice(0, 4))),
    month: String(Number(date.slice(5, 7))),
    day: String(Number(date.slice(8, 10))),
  };
}
