import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/people/ana", "/people/ana"],
    ["/leaderboard?window=month", "/leaderboard?window=month"],
    [undefined, "/"],
    ["", "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["javascript:alert(1)", "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
