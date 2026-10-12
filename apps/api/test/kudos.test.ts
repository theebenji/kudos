import { encodeGlobalID } from "@pothos/plugin-relay";
import { kudoRecipients, kudos, outboxEvents } from "@repo/db";
import { docFromText } from "@repo/rich-text";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertUser, insertValue, setupTestApi, signToken } from "./helpers";

const { db, gql } = setupTestApi();

const uid = (id: string) => encodeGlobalID("User", id);
const vid = (id: string) => encodeGlobalID("Value", id);

const CREATE = /* GraphQL */ `
  mutation ($input: CreateKudoInput!) {
    createKudo(input: $input) {
      __typename
      ... on CreateKudoSuccess {
        data {
          id
          bodyText
          isEdited
          sender {
            name
          }
          recipients {
            name
          }
          value {
            name
          }
          viewerCanEdit
        }
      }
      ... on ValidationError {
        fieldErrors {
          path
          message
        }
      }
      ... on RateLimitError {
        retryAfterSeconds
      }
      ... on Error {
        message
      }
    }
  }
`;

type CreateResult = {
  createKudo: {
    __typename: string;
    data?: { id: string; bodyText: string; recipients: { name: string }[] };
    fieldErrors?: { path: string; message: string }[];
    message?: string;
  };
};

async function setup() {
  const sender = await insertUser(db, { name: "Sam Sender" });
  const ana = await insertUser(db, { name: "Ana López", team: "Web", department: "Engineering" });
  const ben = await insertUser(db, { name: "Ben Ito", team: "Growth", department: "Product" });
  const token = await signToken(sender.id);
  return { sender, ana, ben, token };
}

async function send(token: string, input: Record<string, unknown>) {
  return gql<CreateResult>(CREATE, {
    token,
    variables: { input: { body: docFromText("Thanks for everything!"), ...input } },
  });
}

describe("createKudo", () => {
  it("creates a kudo with recipients, value and mentions, and writes an outbox event", async () => {
    const { sender, ana, ben, token } = await setup();
    const value = await insertValue(db, "Teamwork");
    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Thanks! Also " },
            {
              type: "mention",
              attrs: { id: ben.id, label: "Ben Ito", mentionSuggestionChar: "@" },
            },
          ],
        },
      ],
    };
    const result = await send(token, { recipientIds: [uid(ana.id)], valueId: vid(value.id), body });

    expect(result.data?.createKudo).toMatchObject({
      __typename: "CreateKudoSuccess",
      data: {
        bodyText: "Thanks! Also @Ben Ito",
        isEdited: false,
        sender: { name: "Sam Sender" },
        recipients: [{ name: "Ana López" }],
        value: { name: "Teamwork" },
        viewerCanEdit: true,
      },
    });
    const [event] = await db.select().from(outboxEvents);
    expect(event).toMatchObject({
      type: "kudo.created",
      payload: { senderId: sender.id, recipientIds: [ana.id], mentionIds: [ben.id] },
    });
    // Editor-only attrs never reach the database.
    const [row] = await db.select().from(kudos);
    expect(JSON.stringify(row?.bodyDoc)).not.toContain("mentionSuggestionChar");
  });

  it.each([
    [
      "no recipients",
      () => ({ recipientIds: [] }),
      { path: "recipientIds", message: "Choose at least one person" },
    ],
    [
      "a heading in the body",
      (ids: string[]) => ({
        recipientIds: ids,
        body: { type: "doc", content: [{ type: "heading", content: [] }] },
      }),
      { path: "body.content.0.type" },
    ],
    [
      "an empty message",
      (ids: string[]) => ({ recipientIds: ids, body: docFromText("") }),
      { path: "body", message: "Write a message" },
    ],
    [
      "a message over 500 characters",
      (ids: string[]) => ({ recipientIds: ids, body: docFromText("x".repeat(501)) }),
      { path: "body", message: "Keep it under 500 characters" },
    ],
  ])("rejects %s", async (_label, input, expected) => {
    const { ana, token } = await setup();
    const result = await send(token, input([uid(ana.id)]));
    expect(result.data?.createKudo.__typename).toBe("ValidationError");
    expect(result.data?.createKudo.fieldErrors).toContainEqual(expect.objectContaining(expected));
  });

  it("refuses self-kudos", async () => {
    const { sender, token } = await setup();
    const result = await send(token, { recipientIds: [uid(sender.id)] });
    expect(result.data?.createKudo.fieldErrors).toEqual([
      { path: "recipientIds", message: "You can't give yourself kudos" },
    ]);
  });

  it("refuses more than 10 recipients", async () => {
    const { token } = await setup();
    const many = await Promise.all(Array.from({ length: 11 }, () => insertUser(db)));
    const result = await send(token, { recipientIds: many.map((u) => uid(u.id)) });
    expect(result.data?.createKudo.fieldErrors).toEqual([
      { path: "recipientIds", message: "Choose at most 10 people" },
    ]);
  });

  it("refuses deactivated recipients, archived values and unknown mentions", async () => {
    const { ana, token } = await setup();
    const gone = await insertUser(db, { deactivatedAt: new Date() });
    const archived = await insertValue(db, "Hustle", { archived: true });
    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "0199c3a2-6d1f-7c3e-9a1b-000000000000", label: "Ghost" },
            },
          ],
        },
      ],
    };
    const result = await send(token, {
      recipientIds: [uid(ana.id), uid(gone.id)],
      valueId: vid(archived.id),
      body,
    });
    expect(result.data?.createKudo.fieldErrors).toEqual([
      { path: "recipientIds", message: "Some of those people aren't available" },
      { path: "valueId", message: "“Hustle” is archived" },
      { path: "body", message: "Someone you mentioned isn't available" },
    ]);
    expect(await db.select().from(kudos)).toHaveLength(0);
  });

  it("rate-limits senders to 30 kudos an hour", async () => {
    const { sender, ana, token } = await setup();
    await db.insert(kudos).values(
      Array.from({ length: 30 }, () => ({
        senderId: sender.id,
        bodyDoc: docFromText("hi"),
        bodyText: "hi",
      })),
    );
    const result = await send(token, { recipientIds: [uid(ana.id)] });
    expect(result.data?.createKudo).toMatchObject({
      __typename: "RateLimitError",
      retryAfterSeconds: 3600,
    });
  });

  it("requires sign-in", async () => {
    const { ana } = await setup();
    const result = await gql(CREATE, {
      variables: { input: { recipientIds: [uid(ana.id)], body: docFromText("hi") } },
    });
    expect(result.errors?.[0]?.message).toMatch(/not authorized/i);
  });
});

describe("updateKudo and deleteKudo", () => {
  const UPDATE = /* GraphQL */ `
    mutation ($input: UpdateKudoInput!) {
      updateKudo(input: $input) {
        __typename
        ... on UpdateKudoSuccess {
          data {
            bodyText
            isEdited
          }
        }
        ... on Error {
          message
        }
      }
    }
  `;
  const DELETE = /* GraphQL */ `
    mutation ($id: ID!) {
      deleteKudo(id: $id) {
        __typename
        ... on DeleteKudoSuccess {
          data
        }
        ... on Error {
          message
        }
      }
    }
  `;

  async function kudoFrom(token: string, recipientId: string) {
    const result = await send(token, { recipientIds: [uid(recipientId)] });
    return result.data?.createKudo.data?.id as string;
  }

  it("lets the sender edit, marks it edited, and reports newly added mentions", async () => {
    const { ana, ben, token } = await setup();
    const id = await kudoFrom(token, ana.id);
    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Even better, " },
            { type: "mention", attrs: { id: ben.id, label: "Ben Ito" } },
          ],
        },
      ],
    };
    const result = await gql(UPDATE, { token, variables: { input: { id, body } } });
    expect(result.data).toEqual({
      updateKudo: {
        __typename: "UpdateKudoSuccess",
        data: { bodyText: "Even better, @Ben Ito", isEdited: true },
      },
    });
    const events = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.type, "kudo.mentions_added"));
    expect(events.map((e) => e.payload.mentionIds)).toEqual([[ben.id]]);
  });

  it("doesn't let anyone else edit", async () => {
    const { ana, token } = await setup();
    const id = await kudoFrom(token, ana.id);
    const result = await gql(UPDATE, {
      token: await signToken(ana.id),
      variables: { input: { id, body: docFromText("mine now") } },
    });
    expect(result.data).toEqual({
      updateKudo: { __typename: "ForbiddenError", message: "Only the sender can edit a kudo" },
    });
  });

  it("soft-deletes for the sender or an admin, but not other members", async () => {
    const { ana, ben, token } = await setup();
    const admin = await insertUser(db, { role: "admin" });
    const first = await kudoFrom(token, ana.id);
    const second = await kudoFrom(token, ben.id);

    expect(
      (await gql(DELETE, { token: await signToken(ana.id), variables: { id: first } })).data,
    ).toEqual({
      deleteKudo: {
        __typename: "ForbiddenError",
        message: "Only the sender or an admin can delete a kudo",
      },
    });
    expect((await gql(DELETE, { token, variables: { id: first } })).data).toEqual({
      deleteKudo: { __typename: "DeleteKudoSuccess", data: first },
    });
    expect(
      (await gql(DELETE, { token: await signToken(admin.id), variables: { id: second } })).data,
    ).toMatchObject({
      deleteKudo: { __typename: "DeleteKudoSuccess" },
    });

    // Gone from the feed, lookups and counts; still in the database for the audit view.
    const after = await gql(
      `{ kudos(first: 10) { edges { node { id } } } kudo(id: "${first}") { id } }`,
      { token },
    );
    expect(after.data).toEqual({ kudos: { edges: [] }, kudo: null });
    const counts = await gql(
      `{ user(handle: "${ana.handle}") { kudosReceivedCount kudosReceived(first: 5) { edges { node { id } } } } }`,
      { token },
    );
    expect(counts.data).toEqual({ user: { kudosReceivedCount: 0, kudosReceived: { edges: [] } } });
    expect(await db.select().from(kudos)).toHaveLength(2);
    expect((await gql(DELETE, { token, variables: { id: first } })).data).toEqual({
      deleteKudo: { __typename: "NotFoundError", message: "That kudo doesn't exist" },
    });
  });
});

describe("feed and profiles", () => {
  const FEED = /* GraphQL */ `
    query ($first: Int, $after: String, $filter: KudoFilter) {
      kudos(first: $first, after: $after, filter: $filter) {
        edges {
          node {
            bodyText
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
  type Feed = {
    kudos: {
      edges: { node: { bodyText: string } }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };

  async function seedFeed() {
    const { sender, ana, ben, token } = await setup();
    const teamwork = await insertValue(db, "Teamwork");
    const t0 = Date.now() - 60_000;
    const rows = [
      { text: "oldest to Ana", to: ana, value: teamwork.id },
      { text: "to Ben", to: ben, value: null },
      { text: "newest to Ana", to: ana, value: null },
    ];
    for (const [i, row] of rows.entries()) {
      const [k] = await db
        .insert(kudos)
        .values({
          senderId: sender.id,
          valueId: row.value,
          bodyDoc: docFromText(row.text),
          bodyText: row.text,
          createdAt: new Date(t0 + i * 1000),
        })
        .returning();
      if (!k) throw new Error("seed insert failed");
      await db.insert(kudoRecipients).values({ kudoId: k.id, userId: row.to.id });
    }
    return { sender, ana, ben, token, teamwork };
  }

  it("lists newest first and pages with cursors", async () => {
    const { token } = await seedFeed();
    const page1 = await gql<Feed>(FEED, { token, variables: { first: 2 } });
    expect(page1.data?.kudos.edges.map((e) => e.node.bodyText)).toEqual([
      "newest to Ana",
      "to Ben",
    ]);
    expect(page1.data?.kudos.pageInfo.hasNextPage).toBe(true);
    const page2 = await gql<Feed>(FEED, {
      token,
      variables: { first: 2, after: page1.data?.kudos.pageInfo.endCursor },
    });
    expect(page2.data?.kudos.edges.map((e) => e.node.bodyText)).toEqual(["oldest to Ana"]);
  });

  it("filters by value, team, department and involvement", async () => {
    const { ben, token, teamwork } = await seedFeed();
    const texts = async (filter: Record<string, unknown>, as = token) =>
      (
        await gql<Feed>(FEED, { token: as, variables: { first: 10, filter } })
      ).data?.kudos.edges.map((e) => e.node.bodyText);

    expect(await texts({ valueId: vid(teamwork.id) })).toEqual(["oldest to Ana"]);
    expect(await texts({ team: "Growth" })).toEqual(["to Ben"]);
    expect(await texts({ department: "Engineering" })).toEqual(["newest to Ana", "oldest to Ana"]);
    expect(await texts({ involvingMe: true }, await signToken(ben.id))).toEqual(["to Ben"]);
  });

  it("shows a person's received and given kudos with counts", async () => {
    const { sender, ana, token } = await seedFeed();
    const result = await gql(
      `{
        ana: user(handle: "${ana.handle}") { kudosReceivedCount kudosGivenCount kudosReceived(first: 5) { edges { node { bodyText } } } }
        sam: user(handle: "${sender.handle}") { kudosGivenCount kudosGiven(first: 1) { edges { node { bodyText recipients { name } } } } }
      }`,
      { token },
    );
    expect(result.data).toEqual({
      ana: {
        kudosReceivedCount: 2,
        kudosGivenCount: 0,
        kudosReceived: {
          edges: [{ node: { bodyText: "newest to Ana" } }, { node: { bodyText: "oldest to Ana" } }],
        },
      },
      sam: {
        kudosGivenCount: 3,
        kudosGiven: {
          edges: [{ node: { bodyText: "newest to Ana", recipients: [{ name: "Ana López" }] } }],
        },
      },
    });
  });
});

describe("search", () => {
  it("finds people by partial or misspelled names, excluding the viewer and former employees", async () => {
    const viewer = await insertUser(db, { name: "Avery Admin" });
    await insertUser(db, { name: "Avery Brooks", title: "Designer" });
    await insertUser(db, { name: "Annabel Lee", team: "Platform" });
    await insertUser(db, { name: "Avery Gone", deactivatedAt: new Date() });
    const token = await signToken(viewer.id);
    const names = async (query: string) =>
      (
        (
          await gql<{ searchPeople: { name: string }[] }>(
            `{ searchPeople(query: "${query}") { name } }`,
            { token },
          )
        ).data?.searchPeople ?? []
      ).map((p) => p.name);

    expect(await names("aver")).toEqual(["Avery Brooks"]);
    expect(await names("anabel")).toEqual(["Annabel Lee"]);
    expect(await names("platform")).toEqual(["Annabel Lee"]);
  });

  it("lists departments and teams of active people", async () => {
    const viewer = await insertUser(db, { department: "Engineering", team: "Web" });
    await insertUser(db, { department: "Design", team: "Brand" });
    await insertUser(db, { department: "Sales", team: "Enterprise", deactivatedAt: new Date() });
    const result = await gql(`{ departments teams }`, { token: await signToken(viewer.id) });
    expect(result.data).toEqual({
      departments: ["Design", "Engineering"],
      teams: ["Brand", "Web"],
    });
  });

  it("searches the bundled GIFs when no GIPHY key is set", async () => {
    const user = await insertUser(db);
    const result = await gql<{ gifSource: string; gifs: { id: string; src: string }[] }>(
      `{ gifSource gifs(query: "thanks", first: 3) { id src } }`,
      { token: await signToken(user.id) },
    );
    expect(result.data?.gifSource).toBe("bundled");
    expect(result.data?.gifs).toContainEqual({ id: "thank-you", src: "/gifs/thank-you.gif" });
  });
});
