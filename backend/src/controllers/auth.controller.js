import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { created, ok } from '../utils/ApiResponse.js';
import { dayKey, safeZone } from '../utils/dates.js';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  hashToken,
  issueSession,
  setAuthCookies,
  verifyRefreshToken,
} from '../services/token.service.js';
import { buildCharacterSnapshot } from '../services/character.service.js';

/**
 * Shape returned by every endpoint that establishes or confirms a session.
 * The access token is echoed in the body as well as set as a cookie, so the
 * SPA works whether or not third-party cookies are available.
 */
const sessionPayload = async (user, accessToken) => ({
  user: user.toPublicJSON(),
  snapshot: await buildCharacterSnapshot(user),
  accessToken,
});

// POST /auth/register
export const register = asyncHandler(async (req, res) => {
  const { email, password, username, timezone } = req.body;

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw ApiError.conflict('An account with that email already exists.', {
      code: 'DUPLICATE',
      details: [{ field: 'email', message: 'That email is already registered.' }],
    });
  }

  const user = new User({ email, username, timezone: safeZone(timezone) });
  await user.setPassword(password);

  const { accessToken, refreshToken } = issueSession(user);
  user.lastLoginAt = new Date();
  await user.save();

  await ActivityLog.create({
    owner: user._id,
    type: 'account_created',
    message: 'Pulled up a chair and lit the lamp.',
    day: dayKey(new Date(), user.timezone),
  });

  setAuthCookies(res, { accessToken, refreshToken });
  return created(res, await sessionPayload(user, accessToken), {
    message: 'Your desk is ready.',
  });
});

// POST /auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password, timezone } = req.body;

  // Always select the hash explicitly — it is `select: false` on the schema.
  const user = await User.findOne({ email }).select('+passwordHash');

  // Same message and roughly the same work for "no such user" and "wrong
  // password", so the endpoint cannot be used to enumerate accounts.
  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.unauthorized('That email and password do not match.', {
      code: 'INVALID_CREDENTIALS',
    });
  }

  if (timezone) user.timezone = safeZone(timezone);
  const { accessToken, refreshToken } = issueSession(user);
  user.lastLoginAt = new Date();
  await user.save();

  setAuthCookies(res, { accessToken, refreshToken });
  return ok(res, await sessionPayload(user, accessToken), { message: 'Welcome back.' });
});

// POST /auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  if (!token) throw ApiError.unauthorized('No session to refresh.');

  const payload = verifyRefreshToken(token);
  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user) throw ApiError.unauthorized('That account no longer exists.');

  // The stored digest must match, so a token revoked by logout is dead even
  // though it has not expired yet.
  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('That session was ended. Sign in again.');
  }

  const { accessToken, refreshToken } = issueSession(user);
  await user.save();

  setAuthCookies(res, { accessToken, refreshToken });
  return ok(res, await sessionPayload(user, accessToken));
});

// POST /auth/logout
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.findByIdAndUpdate(payload.sub, { refreshTokenHash: null });
    } catch {
      // An expired or forged token needs no revoking — just clear the cookies.
    }
  }
  clearAuthCookies(res);
  return ok(res, null, { message: 'The lamp is off. See you soon.' });
});

// GET /auth/me
export const me = asyncHandler(async (req, res) =>
  ok(res, {
    user: req.user.toPublicJSON(),
    snapshot: await buildCharacterSnapshot(req.user),
  })
);

export default { register, login, refresh, logout, me };
