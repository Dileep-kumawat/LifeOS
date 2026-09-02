import pino from "pino";
import pinoHttpModule from "pino-http";
import { env } from "./config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.idToken",
      "req.body.refreshToken",
      "req.body.token",
      "req.body.code",
      "password",
      "idToken",
      "refreshToken",
      "accessToken",
      "clientSecret",
      "token",
      "code"
    ],
    censor: "[REDACTED]"
  }
});

// Express request logging middleware
const pinoHttp = (pinoHttpModule as any).default || pinoHttpModule;
export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req: any) => req.url === "/api/v1/health"
  }
});
