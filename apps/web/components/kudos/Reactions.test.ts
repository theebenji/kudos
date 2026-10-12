import { describe, expect, it } from "vitest";
import { toggled } from "./Reactions";

const r = (emoji: string, count: number, reactedByViewer: boolean, names: string[]) => ({
  __typename: "ReactionSummary" as const,
  emoji,
  count,
  reactedByViewer,
  names,
});

describe("optimistic reaction toggling", () => {
  it("adds a new emoji", () => {
    expect(toggled([], "👏")).toEqual([r("👏", 1, true, ["You"])]);
  });
  it("joins an existing emoji", () => {
    expect(toggled([r("👏", 2, false, ["Ana", "Ben"])], "👏")).toEqual([
      r("👏", 3, true, ["You", "Ana", "Ben"]),
    ]);
  });
  it("leaves an emoji, dropping it when nobody's left", () => {
    expect(toggled([r("👏", 2, true, ["You", "Ana"])], "👏")).toEqual([r("👏", 1, false, ["Ana"])]);
    expect(toggled([r("🎉", 1, true, ["You"])], "🎉")).toEqual([]);
  });
});
