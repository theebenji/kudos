import { type Database, outboxEvents } from "@repo/db";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import type { PubSub } from "../realtime/pubsub";
import { intentsFor } from "./audience";
import type { Delivered, NotificationChannel } from "./channels";

export const MAX_ATTEMPTS = 5;

export type ProcessResult = { processed: number; failed: number; delivered: Delivered[] };

/**
 * Drains pending outbox events (ADR-0006). Each event is claimed with FOR UPDATE SKIP LOCKED and
 * handled in its own transaction, so several workers can run safely and one bad event can't block
 * the rest. Failures are recorded and retried until MAX_ATTEMPTS. Realtime events are published
 * only after the transaction commits, so subscribers never hear about rolled-back rows.
 */
export async function processOutbox(
  db: Database,
  channels: NotificationChannel[],
  pubsub: Pick<PubSub, "publish"> | null,
  { limit = 100 }: { limit?: number } = {},
): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, failed: 0, delivered: [] };
  for (let i = 0; i < limit; i++) {
    let claimedId: string | null = null;
    try {
      const delivered = await db.transaction(async (tx) => {
        const [event] = await tx
          .select()
          .from(outboxEvents)
          .where(and(isNull(outboxEvents.processedAt), lt(outboxEvents.attempts, MAX_ATTEMPTS)))
          .orderBy(outboxEvents.createdAt)
          .limit(1)
          .for("update", { skipLocked: true });
        if (!event) return null;
        claimedId = event.id;
        const intents = await intentsFor(tx, event.type, event.payload);
        const out: Delivered[] = [];
        for (const channel of channels) out.push(...(await channel.deliver(tx, intents)));
        await tx
          .update(outboxEvents)
          .set({ processedAt: new Date() })
          .where(eq(outboxEvents.id, event.id));
        return out;
      });
      if (delivered === null) break;
      result.processed += 1;
      result.delivered.push(...delivered);
      for (const d of delivered)
        pubsub?.publish("notification", d.userId, { notificationId: d.notificationId });
    } catch (error) {
      result.failed += 1;
      if (!claimedId) throw error;
      await db
        .update(outboxEvents)
        .set({
          attempts: sql`${outboxEvents.attempts} + 1`,
          lastError: String((error as Error).message ?? error).slice(0, 2000),
        })
        .where(eq(outboxEvents.id, claimedId));
    }
  }
  return result;
}
