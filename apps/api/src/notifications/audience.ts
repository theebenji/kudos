import { type Database, kudoRecipients, kudos, users } from "@repo/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { NotificationIntent } from "./channels";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Payload = Record<string, unknown>;

const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** The kudo (if still visible) with its sender and recipients. */
async function kudoAudience(tx: Tx, kudoId: string) {
  const [kudo] = await tx
    .select()
    .from(kudos)
    .where(and(eq(kudos.id, kudoId), isNull(kudos.deletedAt)));
  if (!kudo) return null;
  const recipients = await tx
    .select({ id: kudoRecipients.userId })
    .from(kudoRecipients)
    .where(eq(kudoRecipients.kudoId, kudoId));
  return { kudo, involved: [kudo.senderId, ...recipients.map((r) => r.id)] };
}

/** Drops duplicates, the actor themself, and people who've left. */
async function active(tx: Tx, intents: NotificationIntent[]): Promise<NotificationIntent[]> {
  const unique = intents.filter(
    (n, i, all) =>
      n.userId !== n.actorId &&
      all.findIndex((m) => m.userId === n.userId && m.kind === n.kind) === i,
  );
  if (unique.length === 0) return [];
  const ok = await tx
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(
          users.id,
          unique.map((n) => n.userId),
        ),
        isNull(users.deactivatedAt),
      ),
    );
  return unique.filter((n) => ok.some((u) => u.id === n.userId));
}

/**
 * Who hears about each outbox event (SPEC §1.12):
 * - kudo.created → recipients (kudo_received); mentioned people who aren't recipients (mention)
 * - kudo.mentions_added → newly mentioned people who aren't recipients (mention)
 * - comment.created → the kudo's sender and recipients, except the commenter (comment)
 * - reaction.added → the kudo's sender and recipients, except the reactor (reaction, batched)
 */
export async function intentsFor(
  tx: Tx,
  type: string,
  payload: Payload,
): Promise<NotificationIntent[]> {
  const kudoId = str(payload.kudoId);
  switch (type) {
    case "kudo.created":
    case "kudo.mentions_added": {
      const audience = await kudoAudience(tx, kudoId);
      if (!audience) return [];
      const actorId = audience.kudo.senderId;
      const recipients = ids(payload.recipientIds);
      const received =
        type === "kudo.created"
          ? recipients.map((userId) => ({
              userId,
              kind: "kudo_received" as const,
              kudoId,
              actorId,
            }))
          : [];
      const mentioned = ids(payload.mentionIds)
        .filter((id) => !recipients.includes(id))
        .map((userId) => ({ userId, kind: "mention" as const, kudoId, actorId }));
      return active(tx, [...received, ...mentioned]);
    }
    case "comment.created": {
      const audience = await kudoAudience(tx, kudoId);
      if (!audience) return [];
      const actorId = str(payload.authorId);
      const commentId = str(payload.commentId);
      return active(
        tx,
        audience.involved.map((userId) => ({
          userId,
          kind: "comment" as const,
          kudoId,
          actorId,
          commentId,
        })),
      );
    }
    case "reaction.added": {
      const audience = await kudoAudience(tx, kudoId);
      if (!audience) return [];
      const actorId = str(payload.userId);
      return active(
        tx,
        audience.involved.map((userId) => ({ userId, kind: "reaction" as const, kudoId, actorId })),
      );
    }
    default:
      return [];
  }
}
