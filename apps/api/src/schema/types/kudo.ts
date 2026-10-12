import {
  encodeGlobalID,
  resolveCursorConnection,
  type ResolveCursorConnectionArgs,
} from "@pothos/plugin-relay";
import { type Kudo, kudoMentions, kudoRecipients, kudos, type User, users } from "@repo/db";
import { and, count, desc, eq, exists, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import { createKudo, deleteKudo, updateKudo } from "../../domain/kudos";
import { wakeWorker } from "../../realtime/pubsub";
import type { Context } from "../../context";
import { builder } from "../builder";
import { ForbiddenError, NotFoundError, RateLimitError, ValidationError } from "../errors";
import { UserRef } from "./user";
import { ValueRef } from "./value";

/** Kudos visible to everyone: not soft-deleted (admins see deleted ones in the audit view, Phase 6). */
const visible = isNull(kudos.deletedAt);

export const KudoRef = builder.loadableNode("Kudo", {
  id: { resolve: (kudo: Kudo) => kudo.id },
  authScopes: { member: true },
  load: (ids: string[], ctx) =>
    ctx.db
      .select()
      .from(kudos)
      .where(and(inArray(kudos.id, ids), visible)),
  sort: (kudo) => kudo.id,
  fields: (t) => ({
    body: t.field({
      type: "JSON",
      description:
        "The message as a ProseMirror document (paragraphs, marks, lists, mentions, GIFs).",
      resolve: (kudo) => kudo.bodyDoc,
    }),
    bodyText: t.exposeString("bodyText", {
      description: "Plain-text version, for previews and search.",
    }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    editedAt: t.expose("editedAt", { type: "DateTime", nullable: true }),
    isEdited: t.boolean({ resolve: (kudo) => kudo.editedAt !== null }),
    sender: t.field({ type: UserRef, resolve: (kudo) => kudo.senderId }),
    value: t.field({ type: ValueRef, nullable: true, resolve: (kudo) => kudo.valueId }),
    recipients: t.loadableGroup({
      type: UserRef,
      load: (kudoIds: string[], ctx) =>
        ctx.db
          .select({ kudoId: kudoRecipients.kudoId, user: users })
          .from(kudoRecipients)
          .innerJoin(users, eq(users.id, kudoRecipients.userId))
          .where(inArray(kudoRecipients.kudoId, kudoIds))
          .orderBy(users.name)
          .then((rows) => rows.map((row) => ({ ...row.user, kudoId: row.kudoId }))),
      // Rows are users plus the kudo they belong to (added in `load`), typed as plain users by Pothos.
      group: (row) => (row as User & { kudoId: string }).kudoId,
      resolve: (kudo) => kudo.id,
    }),
    viewerCanEdit: t.boolean({ resolve: (kudo, _args, ctx) => kudo.senderId === ctx.viewer?.id }),
    viewerCanDelete: t.boolean({
      resolve: (kudo, _args, ctx) =>
        kudo.senderId === ctx.viewer?.id || ctx.viewer?.role === "admin",
    }),
  }),
});

// --- Connections -------------------------------------------------------------------------------

const encodeCursor = (kudo: Kudo) =>
  Buffer.from(JSON.stringify([kudo.createdAt.toISOString(), kudo.id])).toString("base64url");
const decodeCursor = (cursor: string) => {
  const [createdAt, id] = JSON.parse(Buffer.from(cursor, "base64url").toString()) as [
    string,
    string,
  ];
  return { createdAt: new Date(createdAt), id };
};

/** Newest-first keyset pagination over (created_at, id), matching the `kudos_feed_idx` index. */
function kudoConnection(
  ctx: Context,
  args: Parameters<typeof resolveCursorConnection>[0]["args"],
  where: SQL | undefined,
) {
  return resolveCursorConnection(
    { args, toCursor: encodeCursor },
    ({ before, after, limit, inverted }: ResolveCursorConnectionArgs) => {
      const a = after ? decodeCursor(after) : null;
      const b = before ? decodeCursor(before) : null;
      return ctx.db
        .select()
        .from(kudos)
        .where(
          and(
            visible,
            where,
            a
              ? sql`(${kudos.createdAt}, ${kudos.id}) < (${a.createdAt}, ${a.id}::uuid)`
              : undefined,
            b
              ? sql`(${kudos.createdAt}, ${kudos.id}) > (${b.createdAt}, ${b.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(
          ...(inverted ? [kudos.createdAt, kudos.id] : [desc(kudos.createdAt), desc(kudos.id)]),
        )
        .limit(limit);
    },
  );
}

const receivedBy = (userId: string) =>
  exists(
    sql`(select 1 from ${kudoRecipients} where ${kudoRecipients.kudoId} = ${kudos.id} and ${kudoRecipients.userId} = ${userId})`,
  );

const KudoFilter = builder.inputType("KudoFilter", {
  fields: (t) => ({
    valueId: t.globalID({ for: [ValueRef], description: "Only kudos tagged with this value." }),
    department: t.string({ description: "Only kudos with a recipient in this department." }),
    team: t.string({ description: "Only kudos with a recipient on this team." }),
    involvingMe: t.boolean({ description: "Only kudos I sent, received, or was mentioned in." }),
  }),
});

builder.queryFields((t) => ({
  kudos: t.connection(
    {
      type: KudoRef,
      authScopes: { member: true },
      description: "The global feed, newest first.",
      args: { filter: t.arg({ type: KudoFilter }) },
      resolve: (_root, args, ctx) => {
        const f = args.filter;
        const recipientIn = (column: typeof users.department | typeof users.team, value: string) =>
          exists(
            ctx.db
              .select({ one: sql`1` })
              .from(kudoRecipients)
              .innerJoin(users, eq(users.id, kudoRecipients.userId))
              .where(and(eq(kudoRecipients.kudoId, kudos.id), eq(column, value))),
          );
        const me = ctx.viewer?.id;
        return kudoConnection(
          ctx,
          args,
          and(
            f?.valueId ? eq(kudos.valueId, f.valueId.id) : undefined,
            f?.department ? recipientIn(users.department, f.department) : undefined,
            f?.team ? recipientIn(users.team, f.team) : undefined,
            f?.involvingMe && me
              ? or(
                  eq(kudos.senderId, me),
                  receivedBy(me),
                  exists(
                    sql`(select 1 from ${kudoMentions} where ${kudoMentions.kudoId} = ${kudos.id} and ${kudoMentions.userId} = ${me})`,
                  ),
                )
              : undefined,
          ),
        );
      },
    },
    { name: "KudoConnection" },
    { name: "KudoEdge" },
  ),

  kudo: t.field({
    type: KudoRef,
    nullable: true,
    authScopes: { member: true },
    description: "One kudo by id, or null if it doesn't exist or was deleted.",
    args: { id: t.arg.globalID({ for: [KudoRef], required: true }) },
    resolve: async (_root, { id }, ctx) => {
      const [kudo] = await ctx.db
        .select()
        .from(kudos)
        .where(and(eq(kudos.id, id.id), visible));
      return kudo ?? null;
    },
  }),
}));

builder.objectFields(UserRef, (t) => ({
  kudosReceived: t.connection(
    {
      type: KudoRef,
      resolve: (user, args, ctx) => kudoConnection(ctx, args, receivedBy(user.id)),
    },
    { name: "UserKudosReceivedConnection" },
    { name: "UserKudosReceivedEdge" },
  ),
  kudosGiven: t.connection(
    {
      type: KudoRef,
      resolve: (user, args, ctx) => kudoConnection(ctx, args, eq(kudos.senderId, user.id)),
    },
    { name: "UserKudosGivenConnection" },
    { name: "UserKudosGivenEdge" },
  ),
  kudosReceivedCount: t.loadable({
    type: "Int",
    load: async (userIds: string[], ctx) => {
      const rows = await ctx.db
        .select({ userId: kudoRecipients.userId, n: count() })
        .from(kudoRecipients)
        .innerJoin(kudos, eq(kudos.id, kudoRecipients.kudoId))
        .where(and(inArray(kudoRecipients.userId, userIds), visible))
        .groupBy(kudoRecipients.userId);
      return userIds.map((id) => rows.find((r) => r.userId === id)?.n ?? 0);
    },
    resolve: (user) => user.id,
  }),
  kudosGivenCount: t.loadable({
    type: "Int",
    load: async (userIds: string[], ctx) => {
      const rows = await ctx.db
        .select({ userId: kudos.senderId, n: count() })
        .from(kudos)
        .where(and(inArray(kudos.senderId, userIds), visible))
        .groupBy(kudos.senderId);
      return userIds.map((id) => rows.find((r) => r.userId === id)?.n ?? 0);
    },
    resolve: (user) => user.id,
  }),
}));

// --- Mutations ---------------------------------------------------------------------------------

const CreateKudoInput = builder.inputType("CreateKudoInput", {
  fields: (t) => ({
    recipientIds: t.globalIDList({ for: [UserRef], required: true }),
    valueId: t.globalID({ for: [ValueRef] }),
    body: t.field({ type: "JSON", required: true }),
  }),
});

const UpdateKudoInput = builder.inputType("UpdateKudoInput", {
  fields: (t) => ({
    id: t.globalID({ for: [KudoRef], required: true }),
    valueId: t.globalID({ for: [ValueRef] }),
    body: t.field({ type: "JSON", required: true }),
  }),
});

const viewerOf = (ctx: Context) => {
  if (!ctx.viewer) throw new Error("Unreachable: member scope guarantees a viewer");
  return ctx.viewer;
};

builder.mutationFields((t) => ({
  createKudo: t.field({
    type: KudoRef,
    authScopes: { member: true },
    errors: { types: [ValidationError, RateLimitError] },
    args: { input: t.arg({ type: CreateKudoInput, required: true }) },
    resolve: async (_root, { input }, ctx) => {
      const kudo = await createKudo(ctx.db, viewerOf(ctx), {
        recipientIds: input.recipientIds.map((id) => id.id),
        valueId: input.valueId?.id ?? null,
        body: input.body,
      });
      void wakeWorker(ctx.db.$client);
      return kudo;
    },
  }),

  updateKudo: t.field({
    type: KudoRef,
    authScopes: { member: true },
    errors: { types: [ValidationError, NotFoundError, ForbiddenError] },
    args: { input: t.arg({ type: UpdateKudoInput, required: true }) },
    resolve: async (_root, { input }, ctx) => {
      const kudo = await updateKudo(ctx.db, viewerOf(ctx), {
        kudoId: input.id.id,
        valueId: input.valueId?.id ?? null,
        body: input.body,
      });
      void wakeWorker(ctx.db.$client);
      return kudo;
    },
  }),

  deleteKudo: t.field({
    type: "ID",
    description:
      "Soft-deletes a kudo and returns its global id (so clients can evict it from caches).",
    authScopes: { member: true },
    errors: { types: [NotFoundError, ForbiddenError] },
    args: { id: t.arg.globalID({ for: [KudoRef], required: true }) },
    resolve: async (_root, { id }, ctx) => {
      await deleteKudo(ctx.db, viewerOf(ctx), id.id);
      return encodeGlobalID("Kudo", id.id);
    },
  }),
}));
