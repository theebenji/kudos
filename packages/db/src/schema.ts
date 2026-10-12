import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { RichTextDoc } from "./rich-text";

// See docs/domain-model.md for the entity overview and invariants.

export const userRole = pgEnum("user_role", ["member", "admin"]);
export const notificationKind = pgEnum("notification_kind", [
  "kudo_received",
  "comment",
  "mention",
  "reaction",
]);

/** Time-ordered UUIDs (Postgres 18 `uuidv7()`), so ids sort by creation for cursor pagination. */
const id = () =>
  uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`);
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => timestamptz("created_at").notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    handle: text("handle").notNull(),
    name: text("name").notNull(),
    title: text("title"),
    department: text("department"),
    team: text("team"),
    managerId: uuid("manager_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    avatarKey: text("avatar_key"),
    bio: text("bio"),
    role: userRole("role").notNull().default("member"),
    joinedOn: date("joined_on"),
    createdAt: createdAt(),
    deactivatedAt: timestamptz("deactivated_at"),
  },
  (t) => [
    uniqueIndex("users_email_key").on(sql`lower(${t.email})`),
    uniqueIndex("users_handle_key").on(t.handle),
    index("users_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
    index("users_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
    index("users_team_trgm_idx").using("gin", sql`${t.team} gin_trgm_ops`),
    check("users_bio_length", sql`char_length(${t.bio}) <= 280`),
  ],
);

export const values = pgTable(
  "values",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description"),
    emoji: text("emoji"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    archivedAt: timestamptz("archived_at"),
  },
  (t) => [uniqueIndex("values_name_key").on(sql`lower(${t.name})`)],
);

export const kudos = pgTable(
  "kudos",
  {
    id: id(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    valueId: uuid("value_id").references(() => values.id),
    bodyDoc: jsonb("body_doc").$type<RichTextDoc>().notNull(),
    bodyText: text("body_text").notNull(),
    createdAt: createdAt(),
    editedAt: timestamptz("edited_at"),
    deletedAt: timestamptz("deleted_at"),
    deletedById: uuid("deleted_by_id").references(() => users.id),
  },
  (t) => [
    index("kudos_feed_idx")
      .on(t.createdAt.desc(), t.id.desc())
      .where(sql`${t.deletedAt} is null`),
    index("kudos_sender_idx").on(t.senderId, t.createdAt.desc()),
    check("kudos_body_text_length", sql`char_length(${t.bodyText}) between 1 and 500`),
  ],
);

export const kudoRecipients = pgTable(
  "kudo_recipients",
  {
    kudoId: uuid("kudo_id")
      .notNull()
      .references(() => kudos.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    primaryKey({ columns: [t.kudoId, t.userId] }),
    index("kudo_recipients_user_idx").on(t.userId, t.kudoId),
  ],
);

export const kudoMentions = pgTable(
  "kudo_mentions",
  {
    kudoId: uuid("kudo_id")
      .notNull()
      .references(() => kudos.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.kudoId, t.userId] })],
);

export const reactions = pgTable(
  "reactions",
  {
    kudoId: uuid("kudo_id")
      .notNull()
      .references(() => kudos.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    emoji: text("emoji").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.kudoId, t.userId, t.emoji] })],
);

export const comments = pgTable(
  "comments",
  {
    id: id(),
    kudoId: uuid("kudo_id")
      .notNull()
      .references(() => kudos.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: createdAt(),
    editedAt: timestamptz("edited_at"),
    deletedAt: timestamptz("deleted_at"),
    deletedById: uuid("deleted_by_id").references(() => users.id),
  },
  (t) => [
    index("comments_kudo_idx").on(t.kudoId, t.createdAt),
    check("comments_body_length", sql`char_length(${t.body}) between 1 and 1000`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    kind: notificationKind("kind").notNull(),
    kudoId: uuid("kudo_id").references(() => kudos.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id),
    createdAt: createdAt(),
    readAt: timestamptz("read_at"),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.createdAt.desc()),
    index("notifications_unread_idx")
      .on(t.userId)
      .where(sql`${t.readAt} is null`),
  ],
);

/** Written in the same transaction as a domain change; drained by the worker (ADR-0006). */
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: id(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
    processedAt: timestamptz("processed_at"),
  },
  (t) => [
    index("outbox_events_pending_idx")
      .on(t.createdAt)
      .where(sql`${t.processedAt} is null`),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager",
  }),
  reports: many(users, { relationName: "manager" }),
  kudosSent: many(kudos, { relationName: "sender" }),
}));

export const kudosRelations = relations(kudos, ({ one, many }) => ({
  sender: one(users, { fields: [kudos.senderId], references: [users.id], relationName: "sender" }),
  value: one(values, { fields: [kudos.valueId], references: [values.id] }),
  recipients: many(kudoRecipients),
  mentions: many(kudoMentions),
  reactions: many(reactions),
  comments: many(comments),
}));

export const kudoRecipientsRelations = relations(kudoRecipients, ({ one }) => ({
  kudo: one(kudos, { fields: [kudoRecipients.kudoId], references: [kudos.id] }),
  user: one(users, { fields: [kudoRecipients.userId], references: [users.id] }),
}));

export const kudoMentionsRelations = relations(kudoMentions, ({ one }) => ({
  kudo: one(kudos, { fields: [kudoMentions.kudoId], references: [kudos.id] }),
  user: one(users, { fields: [kudoMentions.userId], references: [users.id] }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  kudo: one(kudos, { fields: [reactions.kudoId], references: [kudos.id] }),
  user: one(users, { fields: [reactions.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  kudo: one(kudos, { fields: [comments.kudoId], references: [kudos.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Value = typeof values.$inferSelect;
export type Kudo = typeof kudos.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
