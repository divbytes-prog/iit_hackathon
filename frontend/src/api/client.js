/**
 * The one place the app talks to the network.
 *
 * Responsibilities beyond fetch():
 *   - carries the access token (memory first, localStorage as the survivor
 *     across reloads) and refreshes it transparently on a 401
 *   - turns the API's error envelope into a real Error with `.code`,
 *     `.status` and `.details`, so callers can branch without string-matching
 *   - distinguishes "the network is down" from "the server said no", which is
 *     what lets the UI show an offline banner instead of a scary red toast
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(
  /\/$/,
  ''
);

const TOKEN_KEY = 'hearthlog.token';

let accessToken = null;
try {
  accessToken = localStorage.getItem(TOKEN_KEY);
} catch {
  // Private mode or blocked storage — the session simply lives in memory.
}

export const getToken = () => accessToken;

export const setToken = (token) => {
  accessToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* non-fatal */
  }
};

/** Raised for anything the API rejected, carrying its code and field errors. */
export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details ?? [];
  }

  /** `{ email: 'That email is already registered.' }` for form rendering. */
  get fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

/** Raised when the request never reached the server at all. */
export class NetworkError extends Error {
  constructor() {
    super('We could not reach the kitchen. Check your connection.');
    this.name = 'NetworkError';
    this.status = 0;
    this.code = 'OFFLINE';
    this.details = [];
  }

  get fieldErrors() {
    return {};
  }
}

let refreshInFlight = null;

/**
 * Swap the expired access token for a fresh one using the httpOnly refresh
 * cookie. Concurrent 401s share a single refresh rather than stampeding.
 */
const refreshSession = async () => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) return null;
        const payload = await response.json();
        const token = payload?.data?.accessToken ?? null;
        if (token) setToken(token);
        return token;
      } catch {
        return null;
      } finally {
        // Release the lock on the next tick so followers see the result.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
};

const parse = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Reachability is broadcast rather than returned, because the component that
 * shows the banner is nowhere near the call that discovered the problem.
 *
 * `navigator.onLine` only knows whether a network interface exists — it stays
 * true when the API itself is down, which is the more common failure. These
 * events let the banner reflect what actually happened.
 */
let lastKnownReachable = true;

const announceReachability = (reachable) => {
  if (reachable === lastKnownReachable) return;
  lastKnownReachable = reachable;
  window.dispatchEvent(new Event(reachable ? 'hearthlog:online' : 'hearthlog:offline'));
};

const request = async (method, path, body, { retry = true, signal } = {}) => {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    announceReachability(true);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    announceReachability(false);
    throw new NetworkError();
  }

  // Access token expired — refresh once, then replay the original request.
  if (response.status === 401 && retry && accessToken) {
    const fresh = await refreshSession();
    if (fresh) return request(method, path, body, { retry: false, signal });
    setToken(null);
  }

  const payload = await parse(response);

  if (!response.ok) {
    throw new ApiError(payload?.error?.message ?? 'Something went wrong.', {
      status: response.status,
      code: payload?.error?.code,
      details: payload?.error?.details,
    });
  }

  return payload?.data ?? null;
};

export const api = {
  get: (path, options) => request('GET', path, undefined, options),
  post: (path, body, options) => request('POST', path, body, options),
  patch: (path, body, options) => request('PATCH', path, body, options),
  put: (path, body, options) => request('PUT', path, body, options),
  del: (path, options) => request('DELETE', path, undefined, options),
  baseUrl: BASE_URL,
};

export default api;
