import pino from "pino";
import pinoHttpModule from "pino-http";
import { env } from "./config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['api-key']",
      "req.body.password",
      "req.body.newPassword",
      "req.body.idToken",
      "req.body.refreshToken",
      "req.body.token",
      "req.body.code",
      "password",
      "newPassword",
      "idToken",
      "refreshToken",
      "accessToken",
      "clientSecret",
      "token",
      "resetToken",
      "passwordResetTokenHash",
      "BREVO_API_KEY",
      "FIREBASE_SERVICE_ACCOUNT_JSON",
      "private_key",
      "privateKey",
      "keys.auth",
      "keys.p256dh",
      "apiKey",
      "api-key",
      "code"
    ],
    censor: "[REDACTED]"
  }
});

// Express request logging middleware
const pinoHttp = (pinoHttpModule as any).default || pinoHttpModule;
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: any) => (req as any).id || (req.headers && req.headers["x-request-id"]) || "req-unknown",
  autoLogging: {
    ignore: (req: any) => req.url === "/api/v1/health"
  }
});
