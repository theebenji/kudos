import { resolveCursorConnection, type ResolveCursorConnectionArgs } from "@pothos/plugin-relay";
import { type Notification, notifications } from "@repo/db";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { GraphQLError } from "graphql";
import type { Context } from "../../context";
import { builder } from "../builder";
import { CommentRef } from "./engagement";
import { KudoRef } from "./kudo";
import { UserRef } from "./user";

const KindEnum = builder.enumType("NotificationKind", {
  values: {
    KUDO_RECEIVED: { value: "kudo_received" },
    COMMENT: { value: "comment" },
    MENTION: { value: "mention" },
    REACTION: { value: "reaction" },
  } as const,
});

export const NotificationRef = builder.loadableNode("Notification", {
  id: { resolve: (n: Notification) => n.id },
  authScopes: { member: true },
  // Only the owner can load their notifications, whatever the id.
  load: (ids: string[], ctx: Context) =>
    ctx.db
      .select()
      .from(notifications)
      .where(
        and(
          inArray(notifications.id, ids),
          eq(notifications.userId, ctx.viewer?.id ?? "00000000-0000-0000-0000-000000000000"),
        ),
      ),
  sort: (n) => n.id,
  fields: (t) => ({
    kind: t.expose("kind", { type: KindEnum }),
    count: t.exposeInt("count", {
      description: "Events this stands for (reactions are batched per kudo).",
    }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    isRead: t.boolean({ resolve: (n) => n.readAt !== null }),
    actor: t.field({ type: UserRef, nullable: true, resolve: (n) => n.actorId }),
    kudo: t.field({
      type: KudoRef,
      nullable: true,
      description: "Null if the kudo was deleted.",
      resolve: (n) => n.kudoId,
    }),
    comment: t.field({ type: CommentRef, nullable: true, resolve: (n) => n.commentId }),
  }),
});

const encode = (n: Notification) =>
  Buffer.from(JSON.stringify([n.createdAt.toISOString(), n.id])).toString("base64url");
const decode = (cursor: string) => {
  const [createdAt, id] = JSON.parse(Buffer.from(cursor, "base64url").toString()) as [
    string,
    string,
  ];
  return { createdAt: new Date(createdAt), id };
};
const mine = (ctx: Context) =>
  eq(notifications.userId, ctx.viewer?.id ?? "00000000-0000-0000-0000-000000000000");

builder.queryFields((t) => ({
  notifications: t.connection(
    {
      type: NotificationRef,
      authScopes: { member: true },
      description: "The viewer's notifications, newest first.",
      resolve: (_root, args, ctx) =>
        resolveCursorConnection(
          { args, toCursor: encode },
          ({ before, after, limit, inverted }: ResolveCursorConnectionArgs) => {
            const a = after ? decode(after) : null;
            const b = before ? decode(before) : null;
            return ctx.db
              .select()
              .from(notifications)
              .where(
                and(
                  mine(ctx),
                  a
                    ? sql`(${notifications.createdAt}, ${notifications.id}) < (${a.createdAt}, ${a.id}::uuid)`
                    : undefined,
                  b
                    ? sql`(${notifications.createdAt}, ${notifications.id}) > (${b.createdAt}, ${b.id}::uuid)`
                    : undefined,
                ),
              )
              .orderBy(
                ...(inverted
                  ? [notifications.createdAt, notifications.id]
                  : [desc(notifications.createdAt), desc(notifications.id)]),
              )
              .limit(limit);
          },
        ),
    },
    { name: "NotificationConnection" },
    { name: "NotificationEdge" },
  ),
  unreadNotificationCount: t.int({
    authScopes: { member: true },
    resolve: async (_root, _args, ctx) => {
      const [row] = await ctx.db
        .select({ n: count() })
        .from(notifications)
        .where(and(mine(ctx), isNull(notifications.readAt)));
      return row?.n ?? 0;
    },
  }),
}));

builder.mutationFields((t) => ({
  markNotificationsRead: t.field({
    type: "Int",
    description:
      "Marks the given notifications (or all, if no ids) as read. Returns the remaining unread count.",
    authScopes: { member: true },
    args: { ids: t.arg.globalIDList({ for: [NotificationRef] }) },
    resolve: async (_root, { ids }, ctx) => {
      await ctx.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            mine(ctx),
            isNull(notifications.readAt),
            ids
              ? inArray(
                  notifications.id,
                  ids.map((i) => i.id),
                )
              : undefined,
          ),
        );
      const [row] = await ctx.db
        .select({ n: count() })
        .from(notifications)
        .where(and(mine(ctx), isNull(notifications.readAt)));
      return row?.n ?? 0;
    },
  }),
}));

builder.subscriptionType({
  fields: (t) => ({
    notificationAdded: t.field({
      type: NotificationRef,
      authScopes: { member: true },
      description:
        "Pushes each notification delivered to the viewer (in-app channel, via the worker).",
      // Scope auth runs per resolved event; check at subscribe time too, so anonymous sockets are
      // refused immediately instead of idling on a topic.
      subscribe: (_root, _args, ctx) => {
        if (!ctx.viewer)
          throw new GraphQLError("Not authorized to subscribe", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        return ctx.pubsub.subscribe("notification", ctx.viewer.id);
      },
      resolve: (payload: { notificationId: string }) => payload.notificationId,
    }),
  }),
});
