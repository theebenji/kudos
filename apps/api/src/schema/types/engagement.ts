import { resolveCursorConnection, type ResolveCursorConnectionArgs } from "@pothos/plugin-relay";
import { type Comment, comments, type Kudo, reactions, users } from "@repo/db";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Context } from "../../context";
import { addComment, deleteComment, toggleReaction, updateComment } from "../../domain/engagement";
import { wakeWorker } from "../../realtime/pubsub";
import { builder } from "../builder";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { KudoRef } from "./kudo";
import { UserRef } from "./user";

/** Up to this many reactor names per emoji, for the "who reacted" tooltip. */
const NAMES_PER_EMOJI = 5;

type ReactionSummary = {
  kudoId: string;
  emoji: string;
  count: number;
  reactedByViewer: boolean;
  names: string[];
};

const ReactionSummaryRef = builder.objectRef<ReactionSummary>("ReactionSummary").implement({
  fields: (t) => ({
    emoji: t.exposeString("emoji"),
    count: t.exposeInt("count"),
    reactedByViewer: t.exposeBoolean("reactedByViewer"),
    names: t.exposeStringList("names", {
      description: `Up to ${NAMES_PER_EMOJI} people who reacted, the viewer first as "You".`,
    }),
  }),
});

export const CommentRef = builder.loadableNode("Comment", {
  id: { resolve: (comment: Comment) => comment.id },
  authScopes: { member: true },
  load: (ids: string[], ctx) =>
    ctx.db
      .select()
      .from(comments)
      .where(and(inArray(comments.id, ids), isNull(comments.deletedAt))),
  sort: (comment) => comment.id,
  fields: (t) => ({
    body: t.exposeString("body"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    isEdited: t.boolean({ resolve: (c) => c.editedAt !== null }),
    author: t.field({ type: UserRef, resolve: (c) => c.authorId }),
    kudo: t.field({ type: KudoRef, nullable: true, resolve: (c) => c.kudoId }),
    viewerCanEdit: t.boolean({ resolve: (c, _a, ctx) => c.authorId === ctx.viewer?.id }),
    viewerCanDelete: t.boolean({
      resolve: (c, _a, ctx) => c.authorId === ctx.viewer?.id || ctx.viewer?.role === "admin",
    }),
  }),
});

const encode = (c: Comment) =>
  Buffer.from(JSON.stringify([c.createdAt.toISOString(), c.id])).toString("base64url");
const decode = (cursor: string) => {
  const [createdAt, id] = JSON.parse(Buffer.from(cursor, "base64url").toString()) as [
    string,
    string,
  ];
  return { createdAt: new Date(createdAt), id };
};

builder.objectFields(KudoRef, (t) => ({
  reactions: t.loadableList({
    type: ReactionSummaryRef,
    description: "One entry per emoji, most popular first.",
    load: async (kudoIds: string[], ctx: Context) => {
      const viewer = ctx.viewer?.id ?? "";
      const rows = await ctx.db
        .select({
          kudoId: reactions.kudoId,
          emoji: reactions.emoji,
          count: count(),
          reactedByViewer: sql<boolean>`bool_or(${reactions.userId} = ${viewer})`,
          names: sql<
            string[]
          >`(array_agg(case when ${reactions.userId} = ${viewer} then 'You' else ${users.name} end order by ${reactions.userId} = ${viewer} desc, ${reactions.createdAt}))[1:${sql.raw(String(NAMES_PER_EMOJI))}]`,
          first: sql<Date>`min(${reactions.createdAt})`,
        })
        .from(reactions)
        .innerJoin(users, eq(users.id, reactions.userId))
        .where(inArray(reactions.kudoId, kudoIds))
        .groupBy(reactions.kudoId, reactions.emoji)
        .orderBy(desc(count()), sql`min(${reactions.createdAt})`);
      return kudoIds.map((id) => rows.filter((r) => r.kudoId === id));
    },
    resolve: (kudo) => kudo.id,
  }),
  commentCount: t.loadable({
    type: "Int",
    load: async (kudoIds: string[], ctx: Context) => {
      const rows = await ctx.db
        .select({ kudoId: comments.kudoId, n: count() })
        .from(comments)
        .where(and(inArray(comments.kudoId, kudoIds), isNull(comments.deletedAt)))
        .groupBy(comments.kudoId);
      return kudoIds.map((id) => rows.find((r) => r.kudoId === id)?.n ?? 0);
    },
    resolve: (kudo) => kudo.id,
  }),
  comments: t.connection(
    {
      type: CommentRef,
      description: "Oldest first.",
      resolve: (kudo: Kudo, args, ctx) =>
        resolveCursorConnection(
          { args, toCursor: encode },
          ({ before, after, limit, inverted }: ResolveCursorConnectionArgs) => {
            const a = after ? decode(after) : null;
            const b = before ? decode(before) : null;
            return ctx.db
              .select()
              .from(comments)
              .where(
                and(
                  eq(comments.kudoId, kudo.id),
                  isNull(comments.deletedAt),
                  a
                    ? sql`(${comments.createdAt}, ${comments.id}) > (${a.createdAt}, ${a.id}::uuid)`
                    : undefined,
                  b
                    ? sql`(${comments.createdAt}, ${comments.id}) < (${b.createdAt}, ${b.id}::uuid)`
                    : undefined,
                ),
              )
              .orderBy(
                ...(inverted
                  ? [desc(comments.createdAt), desc(comments.id)]
                  : [asc(comments.createdAt), asc(comments.id)]),
              )
              .limit(limit);
          },
        ),
    },
    { name: "KudoCommentConnection" },
    { name: "KudoCommentEdge" },
  ),
}));

const viewerOf = (ctx: Context) => {
  if (!ctx.viewer) throw new Error("Unreachable: member scope guarantees a viewer");
  return ctx.viewer;
};

builder.mutationFields((t) => ({
  toggleReaction: t.field({
    type: KudoRef,
    description: "Adds the viewer's emoji reaction to a kudo, or removes it if already there.",
    authScopes: { member: true },
    errors: { types: [ValidationError, NotFoundError] },
    args: {
      kudoId: t.arg.globalID({ for: [KudoRef], required: true }),
      emoji: t.arg.string({ required: true }),
    },
    resolve: async (_root, { kudoId, emoji }, ctx) => {
      const { kudo, added } = await toggleReaction(ctx.db, viewerOf(ctx), kudoId.id, emoji);
      if (added) void wakeWorker(ctx.db.$client);
      return kudo;
    },
  }),

  addComment: t.field({
    type: CommentRef,
    authScopes: { member: true },
    errors: { types: [ValidationError, NotFoundError] },
    args: {
      kudoId: t.arg.globalID({ for: [KudoRef], required: true }),
      body: t.arg.string({ required: true }),
    },
    resolve: async (_root, { kudoId, body }, ctx) => {
      const comment = await addComment(ctx.db, viewerOf(ctx), kudoId.id, body);
      void wakeWorker(ctx.db.$client);
      return comment;
    },
  }),

  updateComment: t.field({
    type: CommentRef,
    authScopes: { member: true },
    errors: { types: [ValidationError, NotFoundError, ForbiddenError] },
    args: {
      id: t.arg.globalID({ for: [CommentRef], required: true }),
      body: t.arg.string({ required: true }),
    },
    resolve: (_root, { id, body }, ctx) => updateComment(ctx.db, viewerOf(ctx), id.id, body),
  }),

  deleteComment: t.field({
    type: KudoRef,
    description: "Soft-deletes a comment and returns its kudo (so clients can refresh its count).",
    authScopes: { member: true },
    errors: { types: [NotFoundError, ForbiddenError] },
    args: { id: t.arg.globalID({ for: [CommentRef], required: true }) },
    resolve: async (_root, { id }, ctx) =>
      (await deleteComment(ctx.db, viewerOf(ctx), id.id)).kudoId,
  }),
}));
