import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';

import env from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFound } from './middlewares/notFound.middleware.js';

const app = express();

// Render, Railway and Fly all sit behind a proxy; without this, rate limiting
// keys every request to the proxy's IP and secure cookies are never set.
if (env.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- Security ------------------------------------------------------------
app.use(
  helmet({
    // The API serves JSON only, so the restrictive default CSP is fine, but
    // CORP would block the frontend on another origin from reading responses.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.isProduction ? undefined : false,
  })
);

/**
 * CORS with credentials, which requires echoing the exact origin rather than
 * "*". Requests with no Origin header (curl, health checks, server-to-server)
 * are allowed through.
 */
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// --- Parsing -------------------------------------------------------------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Strips keys containing "$" or "." so a crafted body cannot smuggle a query
// operator into a filter (the classic { "$gt": "" } password bypass).
app.use(mongoSanitize({ replaceWith: '_' }));

app.use(compression());

if (!env.isTest) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

// --- Routes --------------------------------------------------------------
app.use('/api/v1', apiLimiter, routes);

// Friendly root so the bare deployment URL is not a 404.
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Hearthlog API',
      message: 'A cozy Life RPG. The interface lives elsewhere; this is the kitchen.',
      health: '/api/v1/health',
      api: '/api/v1',
    },
  });
});

// --- Failure paths -------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

export default app;
