import { clsx } from "clsx";

import { menuItem } from "@/components/diary/DiaryScreen/menuItem";

import type { SidebarProps } from "./type";
import { useSidebar } from "./useSidebar";

/**
 * Years and months that open and close; choosing a month lists its days.
 * `children` sit under the days and stay in view: when a month runs longer
 * than the room it is given, only the days scroll.
 */
export function Sidebar({ dates, selected, onSelect, children }: SidebarProps) {
  const sidebar = useSidebar(dates, selected);

  return (
    // max-h-full holds it in a parent of fixed height; min-h-0 lets a flex parent with only a max-height shrink it.
    <div className="flex max-h-full min-h-0 flex-col gap-8">
      <nav
        aria-label="日記の日付"
        className={clsx(
          // size
          "min-h-0 overflow-y-auto",
          // spacing: room for the focus outline, which the scroll area would clip
          "-mx-1 px-1 pb-1",
          // typography
          "text-sm",
        )}
      >
        {sidebar.shownMonth ? (
          <div>
            <button
              type="button"
              onClick={sidebar.back}
              className={clsx(menuItem, "mb-2 flex items-center gap-2")}
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
                    className={menuItem}
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
                  className={menuItem}
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
                          className={menuItem}
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
      {children}
    </div>
  );
}
