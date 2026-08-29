import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

import { env } from "./config/env.js";
import { logger, httpLogger } from "./logger.js";
import { connectDb } from "./db/mongoose.js";
import { registerSwagger } from "./plugins/swagger.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { calendarRouter } from "./routes/calendar.js";
import { goalsRouter } from "./routes/goals.js";
import { habitsRouter } from "./routes/habits.js";
import { notesRouter } from "./routes/notes.js";
import { notificationsRouter } from "./routes/notifications.js";
import { aiChatRouter } from "./routes/aiChat.js";
import { aiSummaryRouter } from "./routes/aiSummary.js";
import { financeRouter } from "./routes/finance.js";
import { syncRouter } from "./routes/sync.js";
import { ocrRouter } from "./routes/ocr.js";
import { studyRouter } from "./routes/study.js";
import { passport } from "./auth/passport.js";
import { startJobsWorker } from "./services/jobs.worker.js";
import { setupChatSocket } from "./services/ai/chatSocket.js";
import { dispatchDailySummaries } from "./services/ai/summaryDispatcher.js";

async function main() {
  await connectDb();

  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true }
  });

  setupChatSocket(io);

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(httpLogger);
  app.use(passport.initialize());

  registerSwagger(app);

  const v1 = express.Router();
  v1.use(healthRouter);
  v1.use(authRouter);
  v1.use(calendarRouter);
  v1.use(goalsRouter);
  v1.use(habitsRouter);
  v1.use(notesRouter);
  v1.use(notificationsRouter);
  v1.use(aiChatRouter);
  v1.use(aiSummaryRouter);
  v1.use(financeRouter);
  v1.use(syncRouter);
  v1.use(ocrRouter);
  v1.use(studyRouter);
  app.use("/api/v1", v1);

  // Start the single background job worker (queued deliveries, later OCR,
  // embeddings, daily summaries). No-op under tests.
  startJobsWorker();

  // Periodic dispatcher check for daily summaries (every 5 mins)
  setInterval(
    () => {
      dispatchDailySummaries().catch((err) => {
        logger.error({ err }, "Periodic daily summary dispatcher error");
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
