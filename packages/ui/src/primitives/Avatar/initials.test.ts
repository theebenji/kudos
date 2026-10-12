import { expect, it } from "vitest";
import { initials } from "./initials";

it.each([
  ["Ana López", "AL"],
  ["Abe O'Keefe-Stehr", "AO"],
  ["Mary Jane Watson", "MW"],
  ["Cher", "C"],
  ["  spaced   out  ", "SO"],
  ["", "?"],
  ["Émile Zola", "ÉZ"],
])("%s → %s", (name, expected) => {
  expect(initials(name)).toBe(expected);
});
