const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const sameYear = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const otherYear = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const full = new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" });

/** "just now", "5 minutes ago", "yesterday", "3 days ago", then "Oct 4" / "Oct 4, 2025". */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return relative.format(-Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return relative.format(-Math.floor(diff / HOUR), "hour");
  if (diff < 7 * DAY) return relative.format(-Math.floor(diff / DAY), "day");
  return (date.getFullYear() === now.getFullYear() ? sameYear : otherYear).format(date);
}

/** "October 4, 2026 at 5:00 PM" — for `title` attributes next to relative times. */
export function formatFullDate(date: Date): string {
  return full.format(date);
}
