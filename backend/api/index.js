import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import logger from '../src/utils/logger.js';

/**
 * Vercel serverless entry point.
 *
 * `src/server.js` is still the entry for a normal long-running host: it
 * connects to Mongo and then binds a port. Vercel never binds a port, so this
 * file does the other half — connect, then hand the request to the same
 * Express app.
 *
 * `connectDatabase()` memoises its promise, so a warm instance reuses the
 * existing pool and only a cold start pays for the handshake. Awaiting it on
 * every invocation is therefore cheap, and it is the only way to be certain a
 * freshly-thawed instance has a live connection before it starts querying.
 *
 * A failed connection is reported as a 503 rather than being allowed to become
 * an unhandled rejection — a database that is down should read as "temporarily
 * unavailable", not as a crashed function.
 */
export default async function handler(req, res) {
  try {
    await connectDatabase();
  } catch (error) {
    logger.error('Serverless cold start could not reach MongoDB:', error.message);
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The kitchen is not answering. Try again in a moment.',
      },
    });
    return undefined;
  }

  // An Express app is itself an (req, res) handler, so it can be returned
  // directly to the Node runtime.
  return app(req, res);
}
