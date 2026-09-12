import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const message = (text) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message: text },
});

const common = {
  standardHeaders: true,
  legacyHeaders: false,
  // Skip limiting entirely in tests so the smoke suite can run flat out.
  skip: () => env.isTest,
};

/** Broad ceiling for the whole API. */
export const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: message('You are moving faster than the kettle. Try again shortly.'),
});

/** Tight limit on credential endpoints to blunt password guessing. */
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  message: message('Too many attempts. Take a breath and try again in a few minutes.'),
});

/**
 * A completion is the only endpoint that mints currency, so it gets its own
 * ceiling on top of the diminishing-returns curve in the progression service.
 *
 * The limit is per-IP, so it has to leave room for several people behind one
 * NAT having a productive morning — 150/min is far above human clicking speed
 * while still stopping a script cold.
 */
export const writeLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 150,
  message: message('That is a lot of intentions at once. Give it a moment.'),
});

export default apiLimiter;
