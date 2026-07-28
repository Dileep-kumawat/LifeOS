import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB database connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB database connection disconnected.');
    });

    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    return conn;
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${error}`);
    // Non-blocking throw so server can operate in degraded mode if needed
    throw error;
  }
};
