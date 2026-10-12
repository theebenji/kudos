import { pino } from "pino";
import type { Env } from "./env";

export function createLogger(env: Env) {
  return pino({
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === "development" && { transport: { target: "pino-pretty" } }),
  });
}
