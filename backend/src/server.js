import app from './app.js';
import env from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import logger from './utils/logger.js';

/**
 * Boot order is deliberate: connect to Mongo *before* binding the port, so the
 * process never reports itself ready while the database is unreachable. A
 * platform health check then correctly withholds traffic instead of routing it
 * into 500s.
 */
const start = async () => {
  try {
    await connectDatabase();
  } catch (error) {
    logger.error('Could not reach MongoDB. Check MONGODB_URI and Atlas network access.');
    logger.error(error.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info(`Hearthlog API listening on http://localhost:${env.port} [${env.nodeEnv}]`);
    logger.info(`Health: http://localhost:${env.port}/api/v1/health`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${env.port} is already in use. Set PORT to something else.`);
      process.exit(1);
    }
    throw error;
  });

  /** Finish in-flight requests before the process goes away. */
  const shutdown = async (signal) => {
    logger.info(`${signal} received — closing down.`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Closed cleanly.');
      process.exit(0);
    });

    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    process.exit(1);
  });
};

start();
