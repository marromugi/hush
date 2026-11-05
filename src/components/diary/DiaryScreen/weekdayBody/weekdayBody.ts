/** The bodies the weekdays are named after (月火水木金土日). */
export type Body = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";

/** Sunday first, as `Date.getUTCDay()` counts. */
const byWeekday: readonly Body[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];

/** The body whose kanji names the weekday of `date` (`YYYY-MM-DD`): 月曜 is the moon. */
export function weekdayBody(date: string): Body {
  const weekday = new Date(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))),
  ).getUTCDay();
  return byWeekday[weekday];
}
