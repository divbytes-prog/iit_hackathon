import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/**
 * Two-token scheme:
 *   access  — short lived (15m), sent as a Bearer header or a cookie
 *   refresh — long lived (30d), httpOnly cookie only, hashed in the database
 *
 * Hashing the refresh token server-side means a stolen database row cannot be
 * replayed as a session, and logout can genuinely revoke.
 */

export const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
    issuer: 'hearthlog',
  });

export const signRefreshToken = (user) =>
  jwt.sign({ sub: user._id.toString(), type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
    issuer: 'hearthlog',
  });

const verify = (token, secret, expectedType) => {
  try {
    const payload = jwt.verify(token, secret, { issuer: 'hearthlog' });
    if (payload.type !== expectedType) {
      throw ApiError.unauthorized('That session token is not valid here.');
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Your session has expired. Sign in again.', {
        code: 'TOKEN_EXPIRED',
      });
    }
    throw ApiError.unauthorized('That session token is not valid.');
  }
};

export const verifyAccessToken = (token) => verify(token, env.jwt.accessSecret, 'access');
export const verifyRefreshToken = (token) => verify(token, env.jwt.refreshSecret, 'refresh');

/** Refresh tokens are stored as a SHA-256 digest, never in the clear. */
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const ACCESS_COOKIE = 'hearth_access';
export const REFRESH_COOKIE = 'hearth_refresh';

const baseCookieOptions = () => ({
  httpOnly: true,
  // `sameSite: 'none'` is required when the API and the site are on different
  // domains (the usual Vercel + Render split), and that in turn requires
  // Secure, which is only available over HTTPS — hence the env split.
  sameSite: env.isProduction ? 'none' : 'lax',
  secure: env.isProduction,
  domain: env.cookieDomain,
  path: '/',
});

export const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookieOptions(), maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: env.jwt.refreshTtlMs,
  });
};

export const clearAuthCookies = (res) => {
  const options = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
};

/**
 * Mint a fresh pair and record the refresh digest on the user.
 * The caller is responsible for saving the user document.
 */
export const issueSession = (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  return { accessToken, refreshToken };
};

export default {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
  issueSession,
};
