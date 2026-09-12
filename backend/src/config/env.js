import dotenv from 'dotenv';

dotenv.config();

/**
 * Reads an environment variable, falling back to `fallback`.
 * Throws when a variable is required but missing so the process fails fast
 * at boot instead of halfway through a request.
 */
const read = (key, { fallback, required = false } = {}) => {
  const value = process.env[key] ?? fallback;
  if (required && (value === undefined || value === '')) {
    throw new Error(
      `Missing required environment variable "${key}". Copy .env.example to .env and fill it in.`
    );
  }
  return value;
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nodeEnv = read('NODE_ENV', { fallback: 'development' });

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: toNumber(read('PORT', { fallback: '5000' }), 5000),

  mongoUri: read('MONGODB_URI', { required: true }),
  mongoDbName: read('MONGODB_DB_NAME', { fallback: 'hearthlog' }),

  jwt: {
    accessSecret: read('JWT_ACCESS_SECRET', { required: true }),
    refreshSecret: read('JWT_REFRESH_SECRET', { required: true }),
    accessTtl: read('JWT_ACCESS_TTL', { fallback: '15m' }),
    refreshTtl: read('JWT_REFRESH_TTL', { fallback: '30d' }),
    refreshTtlMs: toNumber(read('JWT_REFRESH_TTL_MS', { fallback: '2592000000' }), 2_592_000_000),
  },

  // Comma separated list. "*" allows any origin (development convenience only).
  corsOrigins: read('CORS_ORIGIN', { fallback: 'http://localhost:5173' })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  cookieDomain: read('COOKIE_DOMAIN', { fallback: '' }) || undefined,
  trustProxy: read('TRUST_PROXY', { fallback: 'false' }) === 'true',
};

export default env;
