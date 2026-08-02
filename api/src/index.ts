import express from "express";
import cors from "cors";

import { env } from "./config/env.js";
import { logger, httpLogger } from "./logger.js";
import { connectDb } from "./db/mongoose.js";
import { registerSwagger } from "./plugins/swagger.js";
import { healthRouter } from "./routes/health.js";
import { passport } from "./auth/passport.js";

async function main() {
  await connectDb();

  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(httpLogger);
  app.use(passport.initialize());

  registerSwagger(app);

  // All feature routes are versioned under /api/v1. New route modules
  // (auth, calendar, goals, habits, notes, ...) mount here as they land in
  // later phases — this is the only place that needs to change.
  const v1 = express.Router();
  v1.use(healthRouter);
  app.use("/api/v1", v1);

  app.listen(env.PORT, () => {
    logger.info(`LifeOS API listening on :${env.PORT}`);
    logger.info(`Swagger UI: http://localhost:${env.PORT}/api/v1/docs`);
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during startup");
  process.exit(1);
});
