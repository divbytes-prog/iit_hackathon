import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

mongoose.set('strictQuery', true);

let connectionPromise = null;

/**
 * Opens (and memoises) the Mongo connection. Serverless platforms may invoke
 * this on every cold start, so repeated calls reuse the same promise.
 */
export const connectDatabase = async () => {
  if (connectionPromise) return connectionPromise;

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (error) => logger.error('MongoDB error', error.message));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  connectionPromise = mongoose
    .connect(env.mongoUri, {
      dbName: env.mongoDbName,
      serverSelectionTimeoutMS: 15_000,
      maxPoolSize: 10,
      autoIndex: !env.isProduction,
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

export const disconnectDatabase = async () => {
  connectionPromise = null;
  await mongoose.connection.close();
};

export default connectDatabase;
