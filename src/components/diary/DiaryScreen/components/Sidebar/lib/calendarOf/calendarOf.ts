export type CalendarDay = { date: string; label: string };

export type CalendarMonth = {
  /** `YYYY-MM`. */
  month: string;
  /** The month alone, in two digits, as in `04`. */
  label: string;
  /** The year and month, as in `2022.04`. */
  title: string;
  days: CalendarDay[];
};

export type CalendarYear = { year: string; months: CalendarMonth[] };

/**
 * `YYYY-MM-DD` dates, oldest first and each once, grouped by year and
 * month. The newest year comes first; months and days run oldest first,
 * as on a calendar.
 */
export function calendarOf(dates: string[]): CalendarYear[] {
  const years: CalendarYear[] = [];
  for (const date of dates) {
    const year = date.slice(0, 4);
    const month = date.slice(0, 7);
    if (years[0]?.year !== year) years.unshift({ year, months: [] });
    const months = years[0].months;
    if (months.at(-1)?.month !== month) {
      const label = date.slice(5, 7);
      months.push({ month, label, title: `${year}.${label}`, days: [] });
    }
    months.at(-1)?.days.push({ date, label: String(Number(date.slice(8, 10))) });
  }
  return years;
}
