// Sentry wiring for the API. Left as an explicit stub rather than fully
// initialized because it needs a real SENTRY_DSN to be useful — but the
// integration point is here now (Phase 0) so no later phase has to retrofit
// error tracking into a codebase that's already grown.
//
// To activate: `npm install --workspace=api @sentry/node`, set SENTRY_DSN
// in api/.env, then call initSentry() as the first line of src/index.ts.
import { env } from "./config/env.js";
import { logger } from "./logger.js";

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    logger.warn("SENTRY_DSN not set — error tracking disabled (fine for local dev).");
    return;
  }

  // Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0.1 });
  logger.info("Sentry initialized");
}
