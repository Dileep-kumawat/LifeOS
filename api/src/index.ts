import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createRedisClient } from "./db/redis.js";

import { env } from "./config/env.js";
import { logger, httpLogger } from "./logger.js";
import { connectDb } from "./db/mongoose.js";
import { registerSwagger } from "./plugins/swagger.js";
import { generalApiRateLimiter } from "./middleware/rateLimiter.js";
import { healthRouter, setActiveIo } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { calendarRouter } from "./routes/calendar.js";
import { goalsRouter } from "./routes/goals.js";
import { habitsRouter } from "./routes/habits.js";
import { notesRouter } from "./routes/notes.js";
import { notificationsRouter } from "./routes/notifications.js";
import { aiChatRouter } from "./routes/aiChat.js";
import { aiSummaryRouter } from "./routes/aiSummary.js";
import { aiRecommendationsRouter } from "./routes/aiRecommendations.js";
import { financeRouter } from "./routes/finance.js";
import { syncRouter } from "./routes/sync.js";
import { ocrRouter } from "./routes/ocr.js";
import { studyRouter } from "./routes/study.js";
import { focusRouter } from "./routes/focus.js";
import { analyticsRouter } from "./routes/analytics.js";
import { adminRouter } from "./routes/admin.js";
import { correlationMiddleware } from "./middleware/correlationMiddleware.js";
import { passport } from "./auth/passport.js";
import { startJobsWorker } from "./services/jobs.worker.js";
import { setupChatSocket } from "./services/ai/chatSocket.js";
import { dispatchDailySummaries } from "./services/ai/summaryDispatcher.js";
import { dispatchPeriodicRecommendations } from "./services/ai/recommendationDispatcher.js";

async function main() {
  await connectDb();

  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    pingInterval: 30000,
    pingTimeout: 25000,
    maxHttpBufferSize: 1e6,
    transports: ["websocket", "polling"]
  });

  try {
    const pubClient = createRedisClient();
    const subClient = createRedisClient();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("Socket.IO Redis adapter initialized successfully");
  } catch (err) {
    logger.warn({ err }, "Redis adapter initialization failed, using in-memory adapter fallback");
  }

  setupChatSocket(io);
  setActiveIo(io);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:"]
        }
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      frameguard: { action: "deny" }
    })
  );
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(correlationMiddleware);
  app.use(httpLogger);
  app.use(passport.initialize());

  registerSwagger(app);

  const v1 = express.Router();
  v1.use(generalApiRateLimiter);
  v1.use(healthRouter);
  v1.use(authRouter);
  v1.use(adminRouter);
  v1.use(calendarRouter);
  v1.use(goalsRouter);
  v1.use(habitsRouter);
  v1.use(notesRouter);
  v1.use(notificationsRouter);
  v1.use(aiChatRouter);
  v1.use(aiSummaryRouter);
  v1.use(aiRecommendationsRouter);
  v1.use(financeRouter);
  v1.use(syncRouter);
  v1.use(ocrRouter);
  v1.use(studyRouter);
  v1.use(focusRouter);
  v1.use(analyticsRouter);
  app.use("/api/v1", v1);

  // Start the single background job worker (queued deliveries, later OCR,
  // embeddings, daily summaries, periodic recommendations). No-op under tests.
  startJobsWorker();

  // Periodic dispatcher check for daily summaries and periodic recommendations (every 5 mins)
  setInterval(
    () => {
      dispatchDailySummaries().catch((err) => {
        logger.error({ err }, "Periodic daily summary dispatcher error");
      });
      dispatchPeriodicRecommendations().catch((err) => {
        logger.error({ err }, "Periodic recommendations dispatcher error");
      });
    },
    5 * 60 * 1000
  );

  server.listen(env.PORT, () => {
    logger.info(`LifeOS API listening on :${env.PORT}`);
    logger.info(`Swagger UI: http://localhost:${env.PORT}/api/v1/docs`);
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during startup");
  process.exit(1);
});
