import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { printedSchema } from "./index";

it("matches the committed schema.graphql (run `pnpm --filter @repo/api schema:print`)", () => {
  const committed = readFileSync(new URL("../../schema.graphql", import.meta.url), "utf8");
  expect(printedSchema()).toBe(committed);
});
