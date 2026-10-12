import { createServer } from "node:http";
import { createDb } from "@repo/db";
import { loadEnv } from "./env";
import { createGifProvider } from "./gifs/provider";
import { createLogger } from "./logger";
import { createApp } from "./yoga";

const env = loadEnv();
const logger = createLogger(env);
const db = createDb(env.DATABASE_URL);
const gifs = createGifProvider(env.GIPHY_API_KEY);
const yoga = createApp({ db, env, gifs });
logger.info(`GIF search: ${gifs.source}`);

const server = createServer(yoga);
server.listen(env.API_PORT, () => {
  logger.info(`GraphQL API ready at http://localhost:${env.API_PORT}${yoga.graphqlEndpoint}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "shutting down");
    server.close(() => void db.$client.end().then(() => process.exit(0)));
  });
}
