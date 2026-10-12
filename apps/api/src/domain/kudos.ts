import {
  type Database,
  kudoMentions,
  kudoRecipients,
  kudos,
  outboxEvents,
  users,
  values,
} from "@repo/db";
import { extractMentionIds, validateDoc } from "@repo/rich-text";
import { and, count, eq, gt, inArray, isNull } from "drizzle-orm";
import type { Viewer } from "../context";
import {
  ForbiddenError,
  type FieldError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "../schema/errors";

// Kudo rules from docs/SPEC.md §1.1 and docs/domain-model.md (invariants enforced by the API).

export const MAX_RECIPIENTS = 10;
export const RATE_LIMIT = { kudos: 30, windowSeconds: 60 * 60 };

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

function fail(fieldErrors: FieldError[]): never {
  throw new ValidationError(fieldErrors);
}

async function checkValue(tx: Tx, valueId: string | null | undefined): Promise<FieldError[]> {
  if (!valueId) return [];
  const [value] = await tx.select().from(values).where(eq(values.id, valueId));
  if (!value) return [{ path: "valueId", message: "That value doesn't exist" }];
  if (value.archivedAt) return [{ path: "valueId", message: `“${value.name}” is archived` }];
  return [];
}

/** Mentioned people must exist and be active (the body comes from the client). */
async function checkMentions(tx: Tx, mentionIds: string[]): Promise<FieldError[]> {
  if (mentionIds.length === 0) return [];
  const found = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, mentionIds), isNull(users.deactivatedAt)));
  return found.length === mentionIds.length
    ? []
    : [{ path: "body", message: "Someone you mentioned isn't available" }];
}

export type CreateKudoInput = { recipientIds: string[]; valueId?: string | null; body: unknown };

export async function createKudo(db: Database, viewer: Viewer, input: CreateKudoInput) {
  const recipientIds = [...new Set(input.recipientIds)];
  const errors: FieldError[] = [];
  if (recipientIds.length === 0)
    errors.push({ path: "recipientIds", message: "Choose at least one person" });
  if (recipientIds.length > MAX_RECIPIENTS) {
    errors.push({ path: "recipientIds", message: `Choose at most ${MAX_RECIPIENTS} people` });
  }
  if (recipientIds.includes(viewer.id))
    errors.push({ path: "recipientIds", message: "You can't give yourself kudos" });
  const body = validateDoc(input.body);
  if (!body.ok) errors.push(...body.issues);
  if (errors.length || !body.ok) fail(errors);

  return db.transaction(async (tx) => {
    const since = new Date(Date.now() - RATE_LIMIT.windowSeconds * 1000);
    const [recent] = await tx
      .select({ n: count() })
      .from(kudos)
      .where(and(eq(kudos.senderId, viewer.id), gt(kudos.createdAt, since)));
    if ((recent?.n ?? 0) >= RATE_LIMIT.kudos) {
      throw new RateLimitError(
        `You've sent ${RATE_LIMIT.kudos} kudos in the last hour. Take a breather and try again soon.`,
        RATE_LIMIT.windowSeconds,
      );
    }

    const active = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, recipientIds), isNull(users.deactivatedAt)));
    const mentionIds = extractMentionIds(body.doc);
    const more = [
      ...(active.length === recipientIds.length
        ? []
        : [{ path: "recipientIds", message: "Some of those people aren't available" }]),
      ...(await checkValue(tx, input.valueId)),
      ...(await checkMentions(tx, mentionIds)),
    ];
    if (more.length) fail(more);

    const [kudo] = await tx
      .insert(kudos)
      .values({
        senderId: viewer.id,
        valueId: input.valueId ?? null,
        bodyDoc: body.doc,
        bodyText: body.text,
      })
      .returning();
    if (!kudo) throw new Error("Insert returned no row");
    await tx
      .insert(kudoRecipients)
      .values(recipientIds.map((userId) => ({ kudoId: kudo.id, userId })));
    if (mentionIds.length)
      await tx
        .insert(kudoMentions)
        .values(mentionIds.map((userId) => ({ kudoId: kudo.id, userId })));
    // Same transaction as the write, so the notification can't be lost (ADR-0006).
    await tx.insert(outboxEvents).values({
      type: "kudo.created",
      payload: { kudoId: kudo.id, senderId: viewer.id, recipientIds, mentionIds },
    });
    return kudo;
  });
}

async function loadOwnKudo(tx: Tx, kudoId: string) {
  const [kudo] = await tx
    .select()
    .from(kudos)
    .where(and(eq(kudos.id, kudoId), isNull(kudos.deletedAt)));
  if (!kudo) throw new NotFoundError("That kudo doesn't exist");
  return kudo;
}

export type UpdateKudoInput = { kudoId: string; valueId?: string | null; body: unknown };

/** Only the sender may edit; recipients are fixed once sent. Newly added mentions are notified. */
export async function updateKudo(db: Database, viewer: Viewer, input: UpdateKudoInput) {
  const body = validateDoc(input.body);
  if (!body.ok) fail(body.issues);
  return db.transaction(async (tx) => {
    const existing = await loadOwnKudo(tx, input.kudoId);
    if (existing.senderId !== viewer.id)
      throw new ForbiddenError("Only the sender can edit a kudo");
    const mentionIds = extractMentionIds(body.doc);
    const recipients = await tx
      .select({ id: kudoRecipients.userId })
      .from(kudoRecipients)
      .where(eq(kudoRecipients.kudoId, existing.id));
    const errors = [
      ...(await checkValue(tx, input.valueId)),
      ...(await checkMentions(tx, mentionIds)),
    ];
    if (errors.length) fail(errors);

    const before = await tx
      .select({ id: kudoMentions.userId })
      .from(kudoMentions)
      .where(eq(kudoMentions.kudoId, existing.id));
    const newMentionIds = mentionIds.filter((id) => !before.some((m) => m.id === id));
    const [kudo] = await tx
      .update(kudos)
      .set({
        bodyDoc: body.doc,
        bodyText: body.text,
        valueId: input.valueId ?? null,
        editedAt: new Date(),
      })
      .where(eq(kudos.id, existing.id))
      .returning();
    await tx.delete(kudoMentions).where(eq(kudoMentions.kudoId, existing.id));
    if (mentionIds.length)
      await tx
        .insert(kudoMentions)
        .values(mentionIds.map((userId) => ({ kudoId: existing.id, userId })));
    if (newMentionIds.length) {
      await tx.insert(outboxEvents).values({
        type: "kudo.mentions_added",
        payload: {
          kudoId: existing.id,
          senderId: viewer.id,
          mentionIds: newMentionIds,
          recipientIds: recipients.map((r) => r.id),
        },
      });
    }
    if (!kudo) throw new Error("Update returned no row");
    return kudo;
  });
}

/** Soft delete (SPEC §1.15): the sender, or an admin for moderation. */
export async function deleteKudo(db: Database, viewer: Viewer, kudoId: string) {
  return db.transaction(async (tx) => {
    const existing = await loadOwnKudo(tx, kudoId);
    if (existing.senderId !== viewer.id && viewer.role !== "admin") {
      throw new ForbiddenError("Only the sender or an admin can delete a kudo");
    }
    await tx
      .update(kudos)
      .set({ deletedAt: new Date(), deletedById: viewer.id })
      .where(eq(kudos.id, existing.id));
    return existing.id;
  });
}
