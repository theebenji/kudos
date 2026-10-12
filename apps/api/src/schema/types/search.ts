import { users } from "@repo/db";
import { and, desc, ilike, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { builder } from "../builder";
import { UserRef } from "./user";

const GifRef = builder
  .objectRef<{ id: string; src: string; alt: string; width: number; height: number }>("Gif")
  .implement({
    fields: (t) => ({
      id: t.exposeString("id"),
      src: t.exposeString("src", {
        description: "Image URL: a bundled /gifs/… path or a GIPHY media URL.",
      }),
      alt: t.exposeString("alt"),
      width: t.exposeInt("width"),
      height: t.exposeInt("height"),
    }),
  });

builder.queryFields((t) => ({
  searchPeople: t.field({
    type: [UserRef],
    authScopes: { member: true },
    description:
      "Active people whose name, title or team matches; best matches first. For pickers and @mentions.",
    args: {
      query: t.arg.string({ required: true }),
      first: t.arg.int({ defaultValue: 8 }),
      excludeViewer: t.arg.boolean({ defaultValue: true }),
    },
    resolve: (_root, { query, first, excludeViewer }, ctx) => {
      const q = query.trim();
      const limit = Math.min(Math.max(first ?? 8, 1), 20);
      // Substring match for typing-as-you-go, trigram word similarity for typos (pg_trgm).
      const rank = sql<number>`greatest(word_similarity(${q}, ${users.name}), word_similarity(${q}, coalesce(${users.title}, '')), word_similarity(${q}, coalesce(${users.team}, '')))`;
      return ctx.db
        .select()
        .from(users)
        .where(
          and(
            isNull(users.deactivatedAt),
            excludeViewer && ctx.viewer ? ne(users.id, ctx.viewer.id) : undefined,
            q
              ? or(
                  ilike(users.name, `%${q.replace(/[%_\\]/g, "\\$&")}%`),
                  sql`${q} <% ${users.name}`,
                  sql`${q} <% coalesce(${users.title}, '')`,
                  sql`${q} <% coalesce(${users.team}, '')`,
                )
              : undefined,
          ),
        )
        .orderBy(desc(rank), users.name)
        .limit(limit);
    },
  }),

  gifs: t.field({
    type: [GifRef],
    authScopes: { member: true },
    description:
      "GIF search for the composer: GIPHY when configured, otherwise the bundled demo set.",
    args: { query: t.arg.string({ defaultValue: "" }), first: t.arg.int({ defaultValue: 12 }) },
    resolve: (_root, { query, first }, ctx) =>
      ctx.gifs.search(query ?? "", Math.min(Math.max(first ?? 12, 1), 24)),
  }),

  departments: t.stringList({
    authScopes: { member: true },
    description: "Departments of active people, for filters.",
    resolve: async (_root, _args, ctx) =>
      (
        await ctx.db
          .selectDistinct({ name: users.department })
          .from(users)
          .where(and(isNull(users.deactivatedAt), isNotNull(users.department)))
          .orderBy(users.department)
      ).map((row) => row.name as string),
  }),

  teams: t.stringList({
    authScopes: { member: true },
    description: "Teams of active people, for filters.",
    resolve: async (_root, _args, ctx) =>
      (
        await ctx.db
          .selectDistinct({ name: users.team })
          .from(users)
          .where(and(isNull(users.deactivatedAt), isNotNull(users.team)))
          .orderBy(users.team)
      ).map((row) => row.name as string),
  }),

  gifSource: t.string({
    authScopes: { member: true },
    description: '"giphy" or "bundled", so the picker can show attribution or a demo-mode note.',
    resolve: (_root, _args, ctx) => ctx.gifs.source,
  }),
}));
