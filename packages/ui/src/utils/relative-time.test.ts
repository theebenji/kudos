import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

const now = new Date("2026-10-11T17:00:00");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;

describe("formatRelativeTime", () => {
  it.each([
    [ago(10_000), "just now"],
    [ago(-5_000), "just now"],
    [ago(MIN), "1 minute ago"],
    [ago(59 * MIN), "59 minutes ago"],
    [ago(60 * MIN), "1 hour ago"],
    [ago(23 * 60 * MIN), "23 hours ago"],
    [ago(24 * 60 * MIN), "yesterday"],
    [ago(6 * 24 * 60 * MIN), "6 days ago"],
    [new Date("2026-10-01T09:00:00"), "Oct 1"],
    [new Date("2025-12-24T09:00:00"), "Dec 24, 2025"],
  ])("%s → %s", (date, expected) => {
    expect(formatRelativeTime(date, now)).toBe(expected);
  });
});
