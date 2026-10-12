import { type Database, notifications } from "@repo/db";
import { sql } from "drizzle-orm";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type NotificationKind = "kudo_received" | "comment" | "mention" | "reaction";

/** What a recipient should be told about. Channels decide how (in-app now, email later). */
export type NotificationIntent = {
  userId: string;
  kind: NotificationKind;
  kudoId: string;
  actorId: string;
  commentId?: string;
};

export type Delivered = { userId: string; notificationId: string; kind: NotificationKind };

/** A way to deliver notifications (ADR-0006). Adding email = another implementation of this. */
export interface NotificationChannel {
  readonly name: string;
  deliver(tx: Tx, intents: NotificationIntent[]): Promise<Delivered[]>;
}

/**
 * Writes notification rows. Reactions are batched: while a person has an unread reaction
 * notification for a kudo, new reactions bump its count and actor instead of adding rows.
 */
export class InAppChannel implements NotificationChannel {
  readonly name = "in-app";

  async deliver(tx: Tx, intents: NotificationIntent[]): Promise<Delivered[]> {
    const delivered: Delivered[] = [];
    for (const intent of intents) {
      const base = {
        userId: intent.userId,
        kind: intent.kind,
        kudoId: intent.kudoId,
        actorId: intent.actorId,
        commentId: intent.commentId ?? null,
      };
      const [row] =
        intent.kind === "reaction"
          ? await tx
              .insert(notifications)
              .values(base)
              .onConflictDoUpdate({
                target: [notifications.userId, notifications.kudoId],
                targetWhere: sql`${notifications.kind} = 'reaction' and ${notifications.readAt} is null`,
                set: {
                  count: sql`${notifications.count} + 1`,
                  actorId: intent.actorId,
                  createdAt: sql`now()`,
                },
              })
              .returning({ id: notifications.id })
          : await tx.insert(notifications).values(base).returning({ id: notifications.id });
      if (row) delivered.push({ userId: intent.userId, notificationId: row.id, kind: intent.kind });
    }
    return delivered;
  }
}
