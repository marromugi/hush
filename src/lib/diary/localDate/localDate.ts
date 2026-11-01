/**
 * `now` as YYYY-MM-DD in the person's own time zone. The day an entry
 * belongs to is the day where the person is, not in UTC.
 */
export function localDate(now: Date): string {
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
