import { describe, expect, it } from "vitest";
import { insertUser, setupTestApi, signToken } from "./helpers";

describe("hardening", () => {
  const { db, gql } = setupTestApi();

  it("rejects queries nested deeper than the limit", async () => {
    const user = await insertUser(db);
    const deep = `{ viewer { ${"manager { ".repeat(11)}id${" }".repeat(11)} } }`;
    const result = await gql(deep, { token: await signToken(user.id) });
    expect(result.status).toBe(400);
    expect(result.errors?.[0]?.message).toMatch(/depth limit of 10 exceeded/i);
  });
});

describe("hardening in production", () => {
  const { gql } = setupTestApi({ NODE_ENV: "production" });

  it("disables introspection", async () => {
    const result = await gql("{ __schema { types { name } } }");
    expect(result.errors?.[0]?.message).toMatch(/introspection/i);
  });
});
