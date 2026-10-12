import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import { createDb, type Database } from "../client";
import { handleBaseFromEmail } from "../queries/users";
import { extractMentionIds, type RichTextDoc, type RichTextNode, toPlainText } from "../rich-text";
import {
  comments,
  kudoMentions,
  kudoRecipients,
  kudos,
  type NewUser,
  notifications,
  reactions,
  users,
  values,
} from "../schema";
import {
  ARCHIVED_VALUE,
  COMMENTS,
  DEPARTMENTS,
  FIXED_USERS,
  KUDO_EMOJI,
  KUDO_OPENERS,
  KUDO_REASONS,
  REACTION_EMOJI,
  VALUES,
} from "./org";

// Deterministic demo data: same seed → same org, so screenshots and demos are reproducible.
// GIF nodes are added in Phase 4, when the bundled GIF set exists.

const USER_COUNT = 50;
const KUDO_COUNT = 300;
const HISTORY_DAYS = 120;
const NOW = new Date("2026-10-11T17:00:00Z");

type SeedUser = { id: string; name: string };

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

async function truncateAll(db: Database) {
  await db.execute(sql`
    truncate table notifications, comments, reactions, kudo_mentions, kudo_recipients,
      kudos, outbox_events, values, users restart identity cascade
  `);
}

function buildUsers(): NewUser[] {
  const result: NewUser[] = FIXED_USERS.map((u) => ({
    ...u,
    handle: handleBaseFromEmail(u.email),
    joinedOn: "2021-03-01",
  }));
  const handles = new Set(result.map((u) => u.handle));

  while (result.length < USER_COUNT) {
    const dept = faker.helpers.arrayElement(DEPARTMENTS);
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const base = handleBaseFromEmail(`${first}.${last}@example.com`);
    let handle = base;
    for (let n = 2; handles.has(handle); n++) handle = `${base}-${n}`;
    handles.add(handle);
    result.push({
      name: `${first} ${last}`,
      email: `${handle}@example.com`,
      handle,
      title: faker.helpers.arrayElement(dept.titles),
      department: dept.department,
      team: faker.helpers.arrayElement(dept.teams),
      bio: faker.datatype.boolean(0.6) ? faker.person.bio().slice(0, 280) : null,
      joinedOn: faker.date
        .between({ from: "2019-01-01", to: "2026-06-01" })
        .toISOString()
        .slice(0, 10),
      role: "member",
    });
  }
  return result;
}

/** One manager per team (first member), reporting to the admin. */
function assignManagers(rows: { id: string; team: string | null }[], adminId: string) {
  const leads = new Map<string, string>();
  return rows.map((row) => {
    if (row.id === adminId || !row.team) return { id: row.id, managerId: null };
    const lead = leads.get(row.team);
    if (!lead) {
      leads.set(row.team, row.id);
      return { id: row.id, managerId: adminId };
    }
    return { id: row.id, managerId: lead };
  });
}

function buildKudoDoc(recipients: SeedUser[], mention: SeedUser | null): RichTextDoc {
  const content: RichTextNode[] = [
    { type: "text", text: `${faker.helpers.arrayElement(KUDO_OPENERS)} ` },
  ];
  recipients.forEach((r, i) => {
    if (i > 0) content.push({ type: "text", text: i === recipients.length - 1 ? " and " : ", " });
    content.push({ type: "text", text: r.name.split(" ")[0] ?? r.name, marks: [{ type: "bold" }] });
  });
  content.push({ type: "text", text: ` ${faker.helpers.arrayElement(KUDO_REASONS)}` });
  if (mention) {
    content.push({ type: "text", text: " — and thanks to " });
    content.push({ type: "mention", attrs: { id: mention.id, label: mention.name } });
    content.push({ type: "text", text: " for the assist" });
  }
  content.push({ type: "text", text: "! " });
  if (faker.datatype.boolean(0.7)) {
    content.push({ type: "emoji", attrs: faker.helpers.arrayElement(KUDO_EMOJI) });
  }
  return { type: "doc", content: [{ type: "paragraph", content }] };
}

export async function seed(db: Database) {
  faker.seed(2026);
  await truncateAll(db);

  const insertedValues = await db
    .insert(values)
    .values([
      ...VALUES.map((v, i) => ({ ...v, sortOrder: i })),
      { ...ARCHIVED_VALUE, sortOrder: VALUES.length, archivedAt: daysAgo(30) },
    ])
    .returning();
  const activeValues = insertedValues.filter((v) => !v.archivedAt);
  const archivedValue = insertedValues.find((v) => v.archivedAt);

  const insertedUsers = await db.insert(users).values(buildUsers()).returning();
  const admin = insertedUsers[0];
  if (!admin) throw new Error("seed: no users inserted");
  for (const { id, managerId } of assignManagers(insertedUsers, admin.id)) {
    if (managerId)
      await db
        .update(users)
        .set({ managerId })
        .where(sql`${users.id} = ${id}`);
  }

  // One former employee, so "Former employee" attribution has data (never one of the fixed users).
  const formerEmployee = insertedUsers.at(-1);
  if (formerEmployee) {
    await db
      .update(users)
      .set({ deactivatedAt: daysAgo(14) })
      .where(sql`${users.id} = ${formerEmployee.id}`);
  }

  const people: SeedUser[] = insertedUsers.map((u) => ({ id: u.id, name: u.name }));
  const createdAtTimes = Array.from({ length: KUDO_COUNT }, () =>
    daysAgo(faker.number.float({ min: 0, max: HISTORY_DAYS })),
  ).sort((a, b) => a.getTime() - b.getTime());

  for (const createdAt of createdAtTimes) {
    const sender = faker.helpers.arrayElement(people);
    const others = people.filter((p) => p.id !== sender.id);
    const recipientCount = faker.helpers.weightedArrayElement([
      { value: 1, weight: 70 },
      { value: 2, weight: 20 },
      { value: 3, weight: 10 },
    ]);
    const recipients = faker.helpers.arrayElements(others, recipientCount);
    const mentionable = others.filter((p) => !recipients.some((r) => r.id === p.id));
    const mention = faker.datatype.boolean(0.15) ? faker.helpers.arrayElement(mentionable) : null;
    const value =
      createdAt < daysAgo(30) && archivedValue && faker.datatype.boolean(0.08)
        ? archivedValue
        : faker.datatype.boolean(0.85)
          ? faker.helpers.arrayElement(activeValues)
          : null;
    const bodyDoc = buildKudoDoc(recipients, mention);
    const deleted = faker.datatype.boolean(0.02);

    const [kudo] = await db
      .insert(kudos)
      .values({
        senderId: sender.id,
        valueId: value?.id ?? null,
        bodyDoc,
        bodyText: toPlainText(bodyDoc),
        createdAt,
        editedAt: faker.datatype.boolean(0.05) ? new Date(createdAt.getTime() + 3_600_000) : null,
        deletedAt: deleted ? new Date(createdAt.getTime() + 86_400_000) : null,
        deletedById: deleted ? sender.id : null,
      })
      .returning({ id: kudos.id });
    if (!kudo) continue;

    await db
      .insert(kudoRecipients)
      .values(recipients.map((r) => ({ kudoId: kudo.id, userId: r.id })));
    const mentionIds = extractMentionIds(bodyDoc);
    if (mentionIds.length) {
      await db
        .insert(kudoMentions)
        .values(mentionIds.map((userId) => ({ kudoId: kudo.id, userId })));
    }
    if (deleted) continue;

    const isRead = createdAt < daysAgo(7);
    await db.insert(notifications).values([
      ...recipients.map((r) => ({
        userId: r.id,
        kind: "kudo_received" as const,
        kudoId: kudo.id,
        actorId: sender.id,
        createdAt,
        readAt: isRead ? createdAt : null,
      })),
      ...mentionIds.map((userId) => ({
        userId,
        kind: "mention" as const,
        kudoId: kudo.id,
        actorId: sender.id,
        createdAt,
        readAt: isRead ? createdAt : null,
      })),
    ]);

    const reactors = faker.helpers.arrayElements(others, { min: 0, max: 6 });
    if (reactors.length) {
      await db.insert(reactions).values(
        reactors.map((r) => ({
          kudoId: kudo.id,
          userId: r.id,
          emoji: faker.helpers.arrayElement(REACTION_EMOJI),
          createdAt: new Date(
            createdAt.getTime() + faker.number.int({ min: 60_000, max: 86_400_000 }),
          ),
        })),
      );
    }

    const commenters = faker.helpers.arrayElements([...recipients, ...others.slice(0, 10)], {
      min: 0,
      max: 3,
    });
    for (const [i, author] of commenters.entries()) {
      await db.insert(comments).values({
        kudoId: kudo.id,
        authorId: author.id,
        body: faker.helpers.arrayElement(COMMENTS),
        createdAt: new Date(createdAt.getTime() + (i + 1) * 1_800_000),
      });
    }
  }

  const [counts] = await db
    .execute<Record<string, number>>(
      sql`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from values) as values,
      (select count(*)::int from kudos) as kudos,
      (select count(*)::int from reactions) as reactions,
      (select count(*)::int from comments) as comments,
      (select count(*)::int from notifications) as notifications
  `,
    )
    .then((r) => r.rows);
  return counts;
}

// CLI entry point: `pnpm db:seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Refusing to seed a production database.");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = createDb(url, { max: 1 });
  const counts = await seed(db);
  await db.$client.end();
  console.log("Seeded:", counts);
}
