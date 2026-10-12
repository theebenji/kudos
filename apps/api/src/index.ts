import { createDb } from "@repo/db";
import { loadEnv } from "./env";
import { createGifProvider } from "./gifs/provider";
import { createLogger } from "./logger";
import { createPgPubSub } from "./realtime/pubsub";
import { createApiServer } from "./server";
import { createApp } from "./yoga";

const env = loadEnv();
const logger = createLogger(env);
const db = createDb(env.DATABASE_URL);
const gifs = createGifProvider(env.GIPHY_API_KEY);
const pubsub = createPgPubSub(db.$client);
const yoga = createApp({ db, env, gifs, pubsub });
const api = createApiServer(yoga);

api.server.listen(env.API_PORT, () => {
  logger.info(
    `GraphQL API ready at http://localhost:${env.API_PORT}${yoga.graphqlEndpoint} (subscriptions: ws://)`,
  );
  logger.info(`GIF search: ${gifs.source}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "shutting down");
    void api
      .close()
      .then(() => pubsub.close())
      .then(() => db.$client.end())
      .then(() => process.exit(0));
  });
}
