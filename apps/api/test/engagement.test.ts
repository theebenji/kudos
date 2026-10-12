import { describe, expect, it } from "vitest";
import { isSingleEmoji } from "../src/domain/engagement";
import { gid, insertKudo } from "./fixtures";
import { insertUser, setupTestApi, signToken } from "./helpers";

const { db, gql } = setupTestApi();

const TOGGLE = /* GraphQL */ `
  mutation ($kudoId: ID!, $emoji: String!) {
    toggleReaction(kudoId: $kudoId, emoji: $emoji) {
      __typename
      ... on ToggleReactionSuccess {
        data {
          reactions {
            emoji
            count
            reactedByViewer
            names
          }
        }
      }
      ... on ValidationError {
        fieldErrors {
          message
        }
      }
    }
  }
`;
type Toggle = {
  toggleReaction: {
    __typename: string;
    data?: {
      reactions: { emoji: string; count: number; reactedByViewer: boolean; names: string[] }[];
    };
  };
};

async function setup() {
  const sender = await insertUser(db, { name: "Sam Sender" });
  const ana = await insertUser(db, { name: "Ana López" });
  const ben = await insertUser(db, { name: "Ben Ito" });
  const kudo = await insertKudo(db, { senderId: sender.id, recipientIds: [ana.id] });
  return { sender, ana, ben, kudo, kudoId: gid("Kudo", kudo.id) };
}

describe("reactions", () => {
  it.each([
    ["👏", true],
    ["❤️", true],
    ["👍🏽", true],
    ["👩‍💻", true],
    ["🇺🇸", true],
    ["a", false],
    ["👏👏", false],
    ["", false],
    ["<script>", false],
  ])("isSingleEmoji(%s) → %s", (value, expected) => {
    expect(isSingleEmoji(value)).toBe(expected);
  });

  it("toggles on and off, and summarizes per emoji with the viewer first", async () => {
    const { ana, ben, kudoId } = await setup();
    const asAna = await signToken(ana.id);
    const asBen = await signToken(ben.id);
    await gql(TOGGLE, { token: asBen, variables: { kudoId, emoji: "👏" } });
    const added = await gql<Toggle>(TOGGLE, { token: asAna, variables: { kudoId, emoji: "👏" } });
    expect(added.data?.toggleReaction.data?.reactions).toEqual([
      { emoji: "👏", count: 2, reactedByViewer: true, names: ["You", "Ben Ito"] },
    ]);
    const removed = await gql<Toggle>(TOGGLE, { token: asAna, variables: { kudoId, emoji: "👏" } });
    expect(removed.data?.toggleReaction.data?.reactions).toEqual([
      { emoji: "👏", count: 1, reactedByViewer: false, names: ["Ben Ito"] },
    ]);
  });

  it("rejects anything that isn't a single emoji", async () => {
    const { ana, kudoId } = await setup();
    const result = await gql<Toggle>(TOGGLE, {
      token: await signToken(ana.id),
      variables: { kudoId, emoji: "lol" },
    });
    expect(result.data?.toggleReaction.__typename).toBe("ValidationError");
  });
});

describe("comments", () => {
  const ADD = /* GraphQL */ `
    mutation ($kudoId: ID!, $body: String!) {
      addComment(kudoId: $kudoId, body: $body) {
        __typename
        ... on AddCommentSuccess {
          data {
            id
            body
            author {
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
        ... on Error {
          message
        }
      }
    }
  `;
  type Add = {
    addComment: {
      __typename: string;
      data?: { id: string; body: string };
      fieldErrors?: unknown[];
      message?: string;
    };
  };

  it("adds, lists oldest first with a count, edits (author only) and soft-deletes", async () => {
    const { sender, ana, ben, kudo, kudoId } = await setup();
    const asAna = await signToken(ana.id);
    const asBen = await signToken(ben.id);
    const first = await gql<Add>(ADD, {
      token: asAna,
      variables: { kudoId, body: "  So deserved!  " },
    });
    expect(first.data?.addComment).toMatchObject({
      __typename: "AddCommentSuccess",
      data: { body: "So deserved!", author: { name: "Ana López" }, viewerCanEdit: true },
    });
    await gql(ADD, { token: asBen, variables: { kudoId, body: "Agreed 🙌" } });

    const list = await gql(
      `{ kudo(id: "${kudoId}") { commentCount comments(first: 10) { edges { node { body } } } } }`,
      { token: asBen },
    );
    expect(list.data).toEqual({
      kudo: {
        commentCount: 2,
        comments: { edges: [{ node: { body: "So deserved!" } }, { node: { body: "Agreed 🙌" } }] },
      },
    });

    const commentId = first.data?.addComment.data?.id;
    const editByOther = await gql(
      `mutation { updateComment(id: "${commentId}", body: "hijack") { __typename ... on Error { message } } }`,
      { token: asBen },
    );
    expect(editByOther.data).toEqual({
      updateComment: {
        __typename: "ForbiddenError",
        message: "Only the author can edit a comment",
      },
    });

    const deleteBySender = await gql(
      `mutation { deleteComment(id: "${commentId}") { __typename } }`,
      { token: await signToken(sender.id) },
    );
    expect(deleteBySender.data).toEqual({ deleteComment: { __typename: "ForbiddenError" } });
    const admin = await insertUser(db, { role: "admin" });
    const deleteByAdmin = await gql(
      `mutation { deleteComment(id: "${commentId}") { __typename ... on DeleteCommentSuccess { data { commentCount } } } }`,
      { token: await signToken(admin.id) },
    );
    expect(deleteByAdmin.data).toEqual({
      deleteComment: { __typename: "DeleteCommentSuccess", data: { commentCount: 1 } },
    });
    expect(kudo.id).toBeTruthy();
  });

  it.each([
    ["an empty comment", "   ", "Write a comment"],
    ["a comment over 1000 characters", "x".repeat(1001), "Keep it under 1000 characters"],
  ])("rejects %s", async (_label, body, message) => {
    const { ana, kudoId } = await setup();
    const result = await gql<Add>(ADD, {
      token: await signToken(ana.id),
      variables: { kudoId, body },
    });
    expect(result.data?.addComment).toMatchObject({
      __typename: "ValidationError",
      fieldErrors: [{ path: "body", message }],
    });
  });
});
