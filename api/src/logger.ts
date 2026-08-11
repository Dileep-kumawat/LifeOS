import pino from "pino";
import pinoHttpModule from "pino-http";
import { env } from "./config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug"
});

// Express request logging middleware
const pinoHttp = (pinoHttpModule as any).default || pinoHttpModule;
export const httpLogger = pinoHttp({ logger });
