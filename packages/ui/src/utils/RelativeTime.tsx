"use client";

import { formatFullDate, formatRelativeTime, formatStableDate } from "./relative-time";
import { useNow } from "./use-now";

/**
 * "3 minutes ago", kept current. During server rendering and hydration it shows a timezone-stable
 * date instead, because server and browser clocks differ (see useNow).
 */
export function RelativeTime({ date, now }: { date: Date; now?: Date }) {
  const clientNow = useNow();
  const reference = now ?? clientNow;
  return (
    <time dateTime={date.toISOString()} title={reference ? formatFullDate(date) : undefined}>
      {reference ? formatRelativeTime(date, reference) : formatStableDate(date)}
    </time>
  );
}
