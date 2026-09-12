/**
 * An error that the API is willing to describe to the client.
 *
 * Anything thrown that is *not* an ApiError is treated as a bug by the error
 * middleware and reported as a generic 500, so internals never leak.
 */
export default class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code ?? httpCodeFor(statusCode);
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message, options) {
    return new ApiError(400, message, options);
  }

  static unauthorized(message = 'You need to be signed in to do that.', options) {
    return new ApiError(401, message, options);
  }

  static forbidden(message = 'That is not yours to change.', options) {
    return new ApiError(403, message, options);
  }

  static notFound(message = 'We could not find that.', options) {
    return new ApiError(404, message, options);
  }

  static conflict(message, options) {
    return new ApiError(409, message, options);
  }

  static tooMany(message = 'Slow down a moment.', options) {
    return new ApiError(429, message, options);
  }

  static internal(message = 'Something went wrong on our side.', options) {
    return new ApiError(500, message, options);
  }
}

const CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

function httpCodeFor(statusCode) {
  return CODES[statusCode] ?? 'ERROR';
}
