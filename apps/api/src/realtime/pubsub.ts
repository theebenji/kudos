import { createPubSub } from "graphql-yoga";
import type pg from "pg";
import { PgEventTarget } from "./pg-event-target";

/** Topics: `notification:<userId>` carries the id of a notification just delivered to that user. */
export type Topics = {
  notification: [userId: string, payload: { notificationId: string }];
};

export type PubSub = ReturnType<typeof createPubSub<Topics>> & { close: () => Promise<void> };

export function createPgPubSub(pool: pg.Pool): PubSub {
  const target = new PgEventTarget(pool);
  return Object.assign(createPubSub<Topics>({ eventTarget: target as never }), {
    close: () => target.close(),
  });
}

/** Wakes the worker after a transaction that wrote outbox events (it also polls as a fallback). */
export const OUTBOX_CHANNEL = "kudos_outbox";
export async function wakeWorker(pool: pg.Pool) {
  await pool.query("select pg_notify($1, '')", [OUTBOX_CHANNEL]).catch(() => undefined);
}
