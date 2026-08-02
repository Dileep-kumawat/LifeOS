import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" }
        }
});

// Express request logging middleware, reusing the same pino instance so
// request logs and app logs share format/level/transport.
export const httpLogger = pinoHttp({ logger });
