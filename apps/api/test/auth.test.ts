import { describe, expect, it } from "vitest";
import { insertUser, setupTestApi, signToken } from "./helpers";

const { db, gql } = setupTestApi();
const VIEWER = /* GraphQL */ `
  {
    viewer {
      name
      role
    }
  }
`;

describe("authentication (auth bridge)", () => {
  it("answers health without a token", async () => {
    expect((await gql("{ health }")).data).toEqual({ health: "ok" });
  });

  it("has no viewer without a token, and refuses member-only fields", async () => {
    expect((await gql(VIEWER)).data).toEqual({ viewer: null });

    const result = await gql("{ values { name } }");
    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toMatch(/not authorized/i);
  });

  it("resolves the viewer from a valid token, with the role from the database", async () => {
    const user = await insertUser(db, { name: "Ada Lovelace", role: "admin" });
    const result = await gql(VIEWER, { token: await signToken(user.id) });
    expect(result.data).toEqual({ viewer: { name: "Ada Lovelace", role: "ADMIN" } });
  });

  it.each([
    ["expired", { expiresIn: "-1m" }],
    ["signed with another secret", { secret: "some-other-secret-that-is-long-enough!!" }],
    ["issued by someone else", { issuer: "evil-web" }],
    ["meant for another audience", { audience: "other-api" }],
  ])("ignores a token that is %s", async (_label, options) => {
    const user = await insertUser(db);
    const result = await gql(VIEWER, { token: await signToken(user.id, options) });
    expect(result.data).toEqual({ viewer: null });
  });

  it("ignores tokens for deactivated users", async () => {
    const user = await insertUser(db, { deactivatedAt: new Date() });
    const result = await gql(VIEWER, { token: await signToken(user.id) });
    expect(result.data).toEqual({ viewer: null });
  });

  it("guards node lookups, which bypass root-field checks", async () => {
    const user = await insertUser(db);
    const { data: own } = await gql<{ viewer: { id: string } }>("{ viewer { id } }", {
      token: await signToken(user.id),
    });
    const id = own?.viewer.id;

    const anonymous = await gql(`{ node(id: "${id}") { id } }`);
    expect(anonymous.errors?.[0]?.message).toMatch(/not authorized/i);

    const signedIn = await gql(`{ node(id: "${id}") { ... on User { handle } } }`, {
      token: await signToken(user.id),
    });
    expect(signedIn.data).toEqual({ node: { handle: user.handle } });
  });
});
