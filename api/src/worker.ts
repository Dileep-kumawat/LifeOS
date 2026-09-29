import { connectDb } from "./db/mongoose.js";
import { logger } from "./logger.js";
import { startJobsWorker, jobsWorker } from "./services/jobs.worker.js";

async function main() {
  logger.info("Starting standalone LifeOS background job worker...");
  await connectDb();

  startJobsWorker();
  logger.info("LifeOS background jobs worker running and ready for queue events.");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down worker process gracefully...");
    try {
      await jobsWorker.close();
      logger.info("Jobs worker closed cleanly.");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during worker shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start standalone worker");
  process.exit(1);
});
