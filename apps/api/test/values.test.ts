import { describe, expect, it } from "vitest";
import { insertUser, insertValue, setupTestApi, signToken } from "./helpers";

const { db, gql } = setupTestApi();

const CREATE = /* GraphQL */ `
  mutation ($input: CreateValueInput!) {
    createValue(input: $input) {
      __typename
      ... on CreateValueSuccess {
        data {
          name
          emoji
          sortOrder
          isArchived
        }
      }
      ... on ValidationError {
        fieldErrors {
          path
          message
        }
      }
      ... on Error {
        message
      }
    }
  }
`;

describe("values", () => {
  it("lists values in order, hiding archived ones unless asked", async () => {
    const member = await insertUser(db);
    await insertValue(db, "Ownership", { sortOrder: 1 });
    await insertValue(db, "Teamwork", { sortOrder: 0 });
    await insertValue(db, "Hustle", { sortOrder: 2, archived: true });
    const token = await signToken(member.id);

    expect((await gql("{ values { name } }", { token })).data).toEqual({
      values: [{ name: "Teamwork" }, { name: "Ownership" }],
    });
    const all = await gql<{ values: { name: string; isArchived: boolean }[] }>(
      "{ values(includeArchived: true) { name isArchived } }",
      { token },
    );
    expect(all.data?.values.at(-1)).toEqual({ name: "Hustle", isArchived: true });
  });

  it("lets an admin create a value, appended to the end of the list", async () => {
    const admin = await insertUser(db, { role: "admin" });
    await insertValue(db, "Teamwork", { sortOrder: 4 });

    const result = await gql(CREATE, {
      token: await signToken(admin.id),
      variables: { input: { name: "  Curiosity ", emoji: "🔍" } },
    });
    expect(result.data).toEqual({
      createValue: {
        __typename: "CreateValueSuccess",
        data: { name: "Curiosity", emoji: "🔍", sortOrder: 5, isArchived: false },
      },
    });
  });

  it("refuses members", async () => {
    const member = await insertUser(db);
    const result = await gql(CREATE, {
      token: await signToken(member.id),
      variables: { input: { name: "Sneaky" } },
    });
    expect(result.errors?.[0]?.message).toMatch(/not authorized/i);
  });

  it("returns field-level validation errors as data", async () => {
    const admin = await insertUser(db, { role: "admin" });
    const result = await gql(CREATE, {
      token: await signToken(admin.id),
      variables: { input: { name: " ", description: "x".repeat(201) } },
    });
    expect(result.data).toEqual({
      createValue: {
        __typename: "ValidationError",
        message: "Some fields are invalid",
        fieldErrors: [
          { path: "name", message: "Name is required" },
          { path: "description", message: "Description must be 200 characters or fewer" },
        ],
      },
    });
  });

  it("returns a conflict for a duplicate name, ignoring case", async () => {
    const admin = await insertUser(db, { role: "admin" });
    await insertValue(db, "Teamwork");
    const result = await gql(CREATE, {
      token: await signToken(admin.id),
      variables: { input: { name: "TEAMWORK" } },
    });
    expect(result.data).toEqual({
      createValue: {
        __typename: "ConflictError",
        message: 'A value named "TEAMWORK" already exists',
      },
    });
  });
});
