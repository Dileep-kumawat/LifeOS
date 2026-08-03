import pino from "pino";
import pinoHttpModule from "pino-http";
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

// Express request logging middleware
const pinoHttp = (pinoHttpModule as any).default || pinoHttpModule;
export const httpLogger = pinoHttp({ logger });
