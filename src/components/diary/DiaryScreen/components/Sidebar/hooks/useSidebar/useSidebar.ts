import { useState } from "react";

import { calendarOf } from "../../lib/calendarOf";
import type { CalendarMonth } from "../../lib/calendarOf";

export type SidebarDay = { date: string; label: string; selected: boolean };

export type SidebarMonth = Omit<CalendarMonth, "days"> & { days: SidebarDay[] };

export type SidebarYear = { year: string; open: boolean; months: SidebarMonth[] };

export type UseSidebar = {
  /** The month whose days are listed; `null` while years and months are listed. */
  shownMonth: SidebarMonth | null;
  years: SidebarYear[];
  toggleYear: (year: string) => void;
  showMonth: (month: string) => void;
  /** Back from the days to the years and months. */
  back: () => void;
};

/**
 * Years and months that open and close, and the days of one month.
 * It starts on the days of `selected`'s month, with its year open.
 */
export function useSidebar(dates: string[], selected: string): UseSidebar {
  const [shownMonth, setShownMonth] = useState<string | null>(() => selected.slice(0, 7));
  const [openYears, setOpenYears] = useState(() => new Set([selected.slice(0, 4)]));

  const years = calendarOf(dates).map(({ year, months }) => ({
    year,
    open: openYears.has(year),
    months: months.map((month) => ({
      ...month,
      days: month.days.map((day) => ({ ...day, selected: day.date === selected })),
    })),
  }));

  return {
    shownMonth:
      years.flatMap(({ months }) => months).find(({ month }) => month === shownMonth) ?? null,
    years,
    toggleYear: (year) =>
      setOpenYears((open) => {
        const next = new Set(open);
        if (!next.delete(year)) next.add(year);
        return next;
      }),
    showMonth: setShownMonth,
    back: () => setShownMonth(null),
  };
}
