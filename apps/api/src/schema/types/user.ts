import {
  encodeGlobalID,
  resolveCursorConnection,
  type ResolveCursorConnectionArgs,
} from "@pothos/plugin-relay";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { type User, users } from "@repo/db";
import { builder } from "../builder";

const UserRoleEnum = builder.enumType("UserRole", {
  values: { MEMBER: { value: "member" }, ADMIN: { value: "admin" } } as const,
});

const FORMER_EMPLOYEE = "Former employee";

export const UserRef = builder.loadableNode("User", {
  id: { resolve: (user: User) => user.id },
  authScopes: { member: true },
  load: (ids: string[], ctx) => ctx.db.select().from(users).where(inArray(users.id, ids)),
  sort: (user) => user.id,
  fields: (t) => ({
    handle: t.exposeString("handle", { description: "URL identifier, used in /people/[handle]" }),
    name: t.string({
      description: `Display name. Deactivated users show as "${FORMER_EMPLOYEE}" to non-admins.`,
      resolve: (user, _args, ctx) =>
        user.deactivatedAt && ctx.viewer?.role !== "admin" ? FORMER_EMPLOYEE : user.name,
    }),
    email: t.string({
      nullable: true,
      description: "Hidden (null) for deactivated users unless the viewer is an admin.",
      resolve: (user, _args, ctx) =>
        user.deactivatedAt && ctx.viewer?.role !== "admin" ? null : user.email,
    }),
    title: t.exposeString("title", { nullable: true }),
    department: t.exposeString("department", { nullable: true }),
    team: t.exposeString("team", { nullable: true }),
    bio: t.exposeString("bio", { nullable: true }),
    role: t.expose("role", { type: UserRoleEnum }),
    joinedOn: t.expose("joinedOn", { type: "Date", nullable: true }),
    isActive: t.boolean({ resolve: (user) => user.deactivatedAt === null }),
  }),
});

// Self-referencing field, added after UserRef exists so its type can be inferred.
builder.objectField(UserRef, "manager", (t) =>
  t.field({ type: UserRef, nullable: true, resolve: (user) => user.managerId }),
);

type UserCursor = { name: string; id: string };
const encodeCursor = (user: User) =>
  Buffer.from(JSON.stringify([user.name, user.id])).toString("base64url");
const decodeCursor = (cursor: string): UserCursor => {
  const [name, id] = JSON.parse(Buffer.from(cursor, "base64url").toString()) as [string, string];
  return { name, id };
};

builder.queryFields((t) => ({
  viewer: t.field({
    type: UserRef,
    nullable: true,
    description: "The signed-in user, or null when the request has no valid token.",
    resolve: (_root, _args, ctx) => ctx.viewer?.id ?? null,
  }),

  user: t.field({
    type: UserRef,
    nullable: true,
    authScopes: { member: true },
    args: { handle: t.arg.string({ required: true }) },
    resolve: async (_root, { handle }, ctx) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.handle, handle));
      return user ?? null;
    },
  }),

  users: t.connection(
    {
      type: UserRef,
      authScopes: { member: true },
      description: "Active people, alphabetical by name.",
      resolve: (_root, args, ctx) =>
        resolveCursorConnection(
          { args, toCursor: encodeCursor },
          ({ before, after, limit, inverted }: ResolveCursorConnectionArgs) => {
            const a = after ? decodeCursor(after) : null;
            const b = before ? decodeCursor(before) : null;
            return ctx.db
              .select()
              .from(users)
              .where(
                and(
                  isNull(users.deactivatedAt),
                  a ? sql`(${users.name}, ${users.id}) > (${a.name}, ${a.id}::uuid)` : undefined,
                  b ? sql`(${users.name}, ${users.id}) < (${b.name}, ${b.id}::uuid)` : undefined,
                ),
              )
              .orderBy(
                ...(inverted
                  ? [desc(users.name), desc(users.id)]
                  : [asc(users.name), asc(users.id)]),
              )
              .limit(limit);
          },
        ),
    },
    { name: "UserConnection" },
    { name: "UserEdge" },
  ),
}));

export const userGlobalId = (id: string) => encodeGlobalID("User", id);
