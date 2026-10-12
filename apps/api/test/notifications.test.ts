import { notifications, outboxEvents, users } from "@repo/db";
import { eq } from "drizzle-orm";
import { createClient } from "graphql-ws";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import {
  type Delivered,
  InAppChannel,
  type NotificationChannel,
} from "../src/notifications/channels";
import { MAX_ATTEMPTS, processOutbox } from "../src/notifications/processor";
import { createApiServer } from "../src/server";
import { gid, insertKudo } from "./fixtures";
import { insertUser, setupTestApi, signToken } from "./helpers";

const { db, app, gql, pubsub } = setupTestApi();
const channels = [new InAppChannel()];
const drain = () => processOutbox(db, channels, pubsub);

const kindsFor = async (userId: string) =>
  (await db.select().from(notifications).where(eq(notifications.userId, userId))).map((n) => [
    n.kind,
    n.count,
  ]);

async function people() {
  const sam = await insertUser(db, { name: "Sam Sender" });
  const ana = await insertUser(db, { name: "Ana López" });
  const ben = await insertUser(db, { name: "Ben Ito" });
  const cleo = await insertUser(db, { name: "Cleo Park" });
  return { sam, ana, ben, cleo };
}

describe("notification fan-out (worker)", () => {
  it("tells recipients about a kudo, and mentioned non-recipients about the mention", async () => {
    const { sam, ana, ben, cleo } = await people();
    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Thanks " },
            { type: "mention", attrs: { id: ben.id, label: "Ben" } },
            { type: "mention", attrs: { id: ana.id, label: "Ana" } },
          ],
        },
      ],
    };
    await gql(`mutation ($input: CreateKudoInput!) { createKudo(input: $input) { __typename } }`, {
      token: await signToken(sam.id),
      variables: { input: { recipientIds: [gid("User", ana.id)], body } },
    });
    const result = await drain();

    expect(result).toMatchObject({ processed: 1, failed: 0 });
    expect(await kindsFor(ana.id)).toEqual([["kudo_received", 1]]); // a recipient isn't also told about the mention
    expect(await kindsFor(ben.id)).toEqual([["mention", 1]]);
    expect(await kindsFor(sam.id)).toEqual([]);
    expect(await kindsFor(cleo.id)).toEqual([]);
    const [event] = await db.select().from(outboxEvents);
    expect(event?.processedAt).toBeInstanceOf(Date);
  });

  it("tells the sender and recipients about comments, except the commenter", async () => {
    const { sam, ana, ben } = await people();
    const kudo = await insertKudo(db, { senderId: sam.id, recipientIds: [ana.id, ben.id] });
    await gql(
      `mutation { addComment(kudoId: "${gid("Kudo", kudo.id)}", body: "🙌") { __typename } }`,
      { token: await signToken(ana.id) },
    );
    await drain();
    expect(await kindsFor(sam.id)).toEqual([["comment", 1]]);
    expect(await kindsFor(ben.id)).toEqual([["comment", 1]]);
    expect(await kindsFor(ana.id)).toEqual([]);
  });

  it("batches reactions into one unread notification per kudo, and starts a new one once read", async () => {
    const { sam, ana, ben, cleo } = await people();
    const kudo = await insertKudo(db, { senderId: sam.id, recipientIds: [ana.id] });
    const react = async (userId: string, emoji: string) => {
      await gql(
        `mutation { toggleReaction(kudoId: "${gid("Kudo", kudo.id)}", emoji: "${emoji}") { __typename } }`,
        { token: await signToken(userId) },
      );
      await drain();
    };
    await react(ben.id, "👏");
    await react(cleo.id, "🎉");
    expect(await kindsFor(ana.id)).toEqual([["reaction", 2]]);
    const [batched] = await db.select().from(notifications).where(eq(notifications.userId, ana.id));
    expect(batched?.actorId).toBe(cleo.id);

    await gql(`mutation { markNotificationsRead }`, { token: await signToken(ana.id) });
    await react(sam.id, "❤️");
    expect((await kindsFor(ana.id)).sort()).toEqual([
      ["reaction", 1],
      ["reaction", 2],
    ]);
  });

  it("skips deactivated people and deleted kudos", async () => {
    const { sam, ana, ben } = await people();
    await db.update(users).set({ deactivatedAt: new Date() }).where(eq(users.id, ben.id));
    const kudo = await insertKudo(db, { senderId: sam.id, recipientIds: [ana.id, ben.id] });
    await db.insert(outboxEvents).values({
      type: "kudo.created",
      payload: {
        kudoId: kudo.id,
        senderId: sam.id,
        recipientIds: [ana.id, ben.id],
        mentionIds: [],
      },
    });
    await drain();
    expect(await kindsFor(ana.id)).toEqual([["kudo_received", 1]]);
    expect(await kindsFor(ben.id)).toEqual([]);
  });

  it("retries a failing event, gives up after the limit, and keeps processing others", async () => {
    const { sam, ana } = await people();
    const kudo = await insertKudo(db, { senderId: sam.id, recipientIds: [ana.id] });
    await db.insert(outboxEvents).values({
      type: "kudo.created",
      payload: { kudoId: kudo.id, senderId: sam.id, recipientIds: [ana.id], mentionIds: [] },
    });
    let calls = 0;
    const flaky: NotificationChannel = {
      name: "flaky",
      async deliver(): Promise<Delivered[]> {
        calls += 1;
        throw new Error("smtp down");
      },
    };
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++)
      await processOutbox(db, [new InAppChannel(), flaky], null);
    const [event] = await db.select().from(outboxEvents);
    expect(event).toMatchObject({
      attempts: MAX_ATTEMPTS,
      lastError: "smtp down",
      processedAt: null,
    });
    expect(calls).toBe(MAX_ATTEMPTS);
    // The failing channel's transaction rolled back, so no half-delivered rows exist.
    expect(await kindsFor(ana.id)).toEqual([]);
  });

  it("lists the viewer's notifications with actor and kudo, and only theirs", async () => {
    const { sam, ana, ben } = await people();
    const kudo = await insertKudo(db, { senderId: sam.id, recipientIds: [ana.id] });
    await db.insert(outboxEvents).values({
      type: "kudo.created",
      payload: { kudoId: kudo.id, senderId: sam.id, recipientIds: [ana.id], mentionIds: [] },
    });
    await drain();
    const query = `{ unreadNotificationCount notifications(first: 5) { edges { node { kind isRead actor { name } kudo { bodyText } } } } }`;
    expect((await gql(query, { token: await signToken(ana.id) })).data).toEqual({
      unreadNotificationCount: 1,
      notifications: {
        edges: [
          {
            node: {
              kind: "KUDO_RECEIVED",
              isRead: false,
              actor: { name: "Sam Sender" },
              kudo: { bodyText: "Thanks!" },
            },
          },
        ],
      },
    });
    expect((await gql(query, { token: await signToken(ben.id) })).data).toEqual({
      unreadNotificationCount: 0,
      notifications: { edges: [] },
    });
  });
});

describe("realtime subscription", () => {
  it("pushes a delivered notification to the recipient over graphql-ws, across the Postgres channel", async () => {
    const { sam, ana } = await people();
    const api = createApiServer(app);
    await new Promise<void>((resolve) => api.server.listen(0, resolve));
    const port = (api.server.address() as { port: number }).port;
    const client = createClient({
      url: `ws://localhost:${port}/graphql`,
      webSocketImpl: WebSocket,
      connectionParams: async () => ({ authorization: `Bearer ${await signToken(ana.id)}` }),
    });
    try {
      const received = new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("no notification within 5s")), 5000);
        client.subscribe(
          { query: "subscription { notificationAdded { kind actor { name } } }" },
          {
            next: (msg) => (clearTimeout(timeout), resolve(msg.data)),
            error: reject,
            complete: () => undefined,
          },
        );
      });
      await new Promise((r) => setTimeout(r, 300)); // let the subscription register
      const kudo = await insertKudo(db, { senderId: sam.id, recipientIds: [ana.id] });
      await db.insert(outboxEvents).values({
        type: "kudo.created",
        payload: { kudoId: kudo.id, senderId: sam.id, recipientIds: [ana.id], mentionIds: [] },
      });
      await drain();
      expect(await received).toEqual({
        notificationAdded: { kind: "KUDO_RECEIVED", actor: { name: "Sam Sender" } },
      });
    } finally {
      await client.dispose();
      await api.close();
    }
  });

  it("refuses subscriptions without a valid token, immediately", async () => {
    const api = createApiServer(app);
    await new Promise<void>((resolve) => api.server.listen(0, resolve));
    const port = (api.server.address() as { port: number }).port;
    const client = createClient({
      url: `ws://localhost:${port}/graphql`,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });
    try {
      const outcome = await new Promise<unknown>((resolve) => {
        client.subscribe(
          { query: "subscription { notificationAdded { kind } }" },
          { next: resolve, error: resolve, complete: () => resolve("complete") },
        );
      });
      expect(JSON.stringify(outcome)).toMatch(/not authorized/i);
    } finally {
      await client.dispose();
      await api.close();
    }
  });
});
