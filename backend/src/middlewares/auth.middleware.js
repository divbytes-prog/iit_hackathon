import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ACCESS_COOKIE, verifyAccessToken } from '../services/token.service.js';

/** Pull the access token from an Authorization header or the cookie. */
const extractToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.[ACCESS_COOKIE] ?? null;
};

/**
 * Gate for every route that touches a character. Resolves the token to a real,
 * still-existing user and hangs it on `req.user`.
 *
 * Every downstream query filters by `req.user._id`. That single convention is
 * what guarantees one account can never read or write another's data.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Sign in to continue.');

  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('That account no longer exists.');

  req.user = user;
  req.userId = user._id;
  next();
});

/** Attaches `req.user` when a valid token is present, but never rejects. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user) {
      req.user = user;
      req.userId = user._id;
    }
  } catch {
    // A bad optional token is simply an anonymous request.
  }
  return next();
});

export default requireAuth;
