import { asc, inArray, isNull, sql } from "drizzle-orm";
import { type Value, values } from "@repo/db";
import { z } from "zod";
import { builder } from "../builder";
import { ConflictError, isUniqueViolation, toValidationError, ValidationError } from "../errors";

export const ValueRef = builder.loadableNode("Value", {
  id: { resolve: (value: Value) => value.id },
  authScopes: { member: true },
  load: (ids: string[], ctx) => ctx.db.select().from(values).where(inArray(values.id, ids)),
  sort: (value) => value.id,
  fields: (t) => ({
    name: t.exposeString("name"),
    description: t.exposeString("description", { nullable: true }),
    emoji: t.exposeString("emoji", { nullable: true }),
    sortOrder: t.exposeInt("sortOrder"),
    isArchived: t.boolean({ resolve: (value) => value.archivedAt !== null }),
    archivedAt: t.expose("archivedAt", { type: "DateTime", nullable: true }),
  }),
});

builder.queryField("values", (t) =>
  t.field({
    type: [ValueRef],
    authScopes: { member: true },
    description: "Company values, in display order. Archived values are excluded unless asked for.",
    args: { includeArchived: t.arg.boolean({ defaultValue: false }) },
    resolve: (_root, { includeArchived }, ctx) =>
      ctx.db
        .select()
        .from(values)
        .where(includeArchived ? undefined : isNull(values.archivedAt))
        .orderBy(asc(values.sortOrder), asc(values.name)),
  }),
);

const CreateValueSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Name must be 40 characters or fewer"),
  description: z.string().trim().max(200, "Description must be 200 characters or fewer").nullish(),
  emoji: z.string().trim().max(16, "Use a single emoji").nullish(),
});

const CreateValueInput = builder.inputType("CreateValueInput", {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string(),
    emoji: t.string(),
  }),
});

builder.mutationField("createValue", (t) =>
  t.field({
    type: ValueRef,
    authScopes: { admin: true },
    errors: { types: [ValidationError, ConflictError] },
    args: { input: t.arg({ type: CreateValueInput, required: true }) },
    resolve: async (_root, { input }, ctx) => {
      const parsed = CreateValueSchema.safeParse(input);
      if (!parsed.success) throw toValidationError(parsed.error.issues);
      try {
        const [value] = await ctx.db
          .insert(values)
          .values({
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            emoji: parsed.data.emoji ?? null,
            sortOrder: sql`(select coalesce(max(${values.sortOrder}), -1) + 1 from ${values})`,
          })
          .returning();
        if (!value) throw new Error("Insert returned no row");
        return value;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictError(`A value named "${parsed.data.name}" already exists`);
        }
        throw error;
      }
    },
  }),
);
