import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './config/database.js';

const startServer = async () => {
  try {
    // Attempt database connection
    try {
      await connectDatabase();
    } catch (dbErr) {
      logger.warn('Starting server without active MongoDB connection (degraded mode)');
    }

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`⚡️[server]: LifeOS Backend API is running at http://localhost:${env.PORT}`);
      logger.info(`📚[docs]: Swagger OpenAPI specification available at http://localhost:${env.PORT}/api-docs`);
    });

    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error(`Server crash: ${error}`);
    process.exit(1);
  }
};

startServer();
