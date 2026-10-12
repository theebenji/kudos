import { createDb } from "@repo/db";
import { loadEnv } from "./env";
import { createLogger } from "./logger";
import { InAppChannel } from "./notifications/channels";
import { processOutbox } from "./notifications/processor";
import { createPgPubSub, OUTBOX_CHANNEL } from "./realtime/pubsub";

// The notification worker (ADR-0006): drains the outbox into in-app notifications and pushes
// them to subscribers. Woken by NOTIFY after each write, with a polling fallback.

const POLL_MS = 5000;
const env = loadEnv();
const logger = createLogger(env);
const db = createDb(env.DATABASE_URL, { max: 3 });
const pubsub = createPgPubSub(db.$client);
const channels = [new InAppChannel()];

let running = false;
let again = false;
async function drain() {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      const result = await processOutbox(db, channels, pubsub);
      if (result.processed || result.failed)
        logger.info(
          result.processed ? { ...result, delivered: result.delivered.length } : result,
          "outbox drained",
        );
    } while (again);
  } catch (error) {
    logger.error({ err: error }, "outbox drain failed");
  } finally {
    running = false;
  }
}

const listener = await db.$client.connect();
listener.on("notification", () => void drain());
await listener.query(`LISTEN ${OUTBOX_CHANNEL}`);
const timer = setInterval(() => void drain(), POLL_MS);
void drain();
logger.info("Notification worker started");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    clearInterval(timer);
    listener.release();
    void pubsub
      .close()
      .then(() => db.$client.end())
      .then(() => process.exit(0));
  });
}
