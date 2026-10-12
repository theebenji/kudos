import { describe, expect, it } from "vitest";
import { insertUser, setupTestApi, signToken } from "./helpers";

const { db, gql } = setupTestApi();

type UsersPage = {
  users: {
    edges: { cursor: string; node: { name: string } }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};
const USERS = /* GraphQL */ `
  query ($first: Int, $after: String) {
    users(first: $first, after: $after) {
      edges {
        cursor
        node {
          name
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

describe("users", () => {
  it("pages through active people alphabetically, skipping deactivated users", async () => {
    const viewer = await insertUser(db, { name: "Zed Viewer" });
    for (const name of ["Cleo", "Abe", "Bea", "Dot"]) await insertUser(db, { name });
    await insertUser(db, { name: "Aaron Gone", deactivatedAt: new Date() });
    const token = await signToken(viewer.id);

    const page1 = await gql<UsersPage>(USERS, { token, variables: { first: 2 } });
    expect(page1.data?.users.edges.map((e) => e.node.name)).toEqual(["Abe", "Bea"]);
    expect(page1.data?.users.pageInfo.hasNextPage).toBe(true);

    const page2 = await gql<UsersPage>(USERS, {
      token,
      variables: { first: 10, after: page1.data?.users.pageInfo.endCursor },
    });
    expect(page2.data?.users.edges.map((e) => e.node.name)).toEqual(["Cleo", "Dot", "Zed Viewer"]);
    expect(page2.data?.users.pageInfo.hasNextPage).toBe(false);
  });

  it("finds a person by handle, including their manager", async () => {
    const manager = await insertUser(db, { name: "Grace Hopper", handle: "grace" });
    const report = await insertUser(db, {
      name: "Alan Turing",
      handle: "alan",
      managerId: manager.id,
      team: "Web",
    });

    const result = await gql(`{ user(handle: "alan") { name team manager { handle } } }`, {
      token: await signToken(report.id),
    });
    expect(result.data).toEqual({
      user: { name: "Alan Turing", team: "Web", manager: { handle: "grace" } },
    });
    expect(
      (await gql(`{ user(handle: "nobody") { name } }`, { token: await signToken(report.id) }))
        .data,
    ).toEqual({
      user: null,
    });
  });

  it('shows deactivated users as "Former employee" to members, but not to admins', async () => {
    await insertUser(db, { name: "Real Name", handle: "gone", deactivatedAt: new Date() });
    const member = await insertUser(db);
    const admin = await insertUser(db, { role: "admin" });
    const query = `{ user(handle: "gone") { name email isActive } }`;

    expect((await gql(query, { token: await signToken(member.id) })).data).toEqual({
      user: { name: "Former employee", email: null, isActive: false },
    });
    expect((await gql(query, { token: await signToken(admin.id) })).data).toEqual({
      user: { name: "Real Name", email: "gone@example.com", isActive: false },
    });
  });
});
