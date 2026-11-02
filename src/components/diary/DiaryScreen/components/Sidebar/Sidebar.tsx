import { clsx } from "clsx";

import { useSidebar } from "./hooks/useSidebar";
import type { SidebarProps } from "./type";

const item = clsx(
  // layout
  "block cursor-pointer py-1",
  // typography
  "tabular-nums",
  // state
  "opacity-50 transition-opacity hover:opacity-100 aria-[current=date]:opacity-100",
);

/** Years and months that open and close; choosing a month lists its days. */
export function Sidebar({ dates, selected, onSelect }: SidebarProps) {
  const sidebar = useSidebar(dates, selected);

  return (
    <nav aria-label="日記の日付" className="text-sm">
      {sidebar.shownMonth ? (
        <div>
          <button
            type="button"
            onClick={sidebar.back}
            className={clsx(item, "mb-2 flex items-center gap-2")}
          >
            <svg viewBox="0 0 12 12" aria-hidden className="size-3">
              <path d="M10 1.5 2.5 6 10 10.5Z" fill="none" stroke="currentColor" />
            </svg>
            {sidebar.shownMonth.title}
          </button>
          <ol className="pl-7">
            {sidebar.shownMonth.days.map((day) => (
              <li key={day.date}>
                <button
                  type="button"
                  aria-current={day.selected ? "date" : undefined}
                  onClick={() => onSelect(day.date)}
                  className={item}
                >
                  {day.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {sidebar.years.map((year) => (
            <li key={year.year}>
              <button
                type="button"
                aria-expanded={year.open}
                onClick={() => sidebar.toggleYear(year.year)}
                className={item}
              >
                {year.year}
              </button>
              {year.open ? (
                <ul className="pl-6">
                  {year.months.map((month) => (
                    <li key={month.month}>
                      <button
                        type="button"
                        onClick={() => sidebar.showMonth(month.month)}
                        className={item}
                      >
                        {month.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
