import mongoose from 'mongoose';
import { ZodError } from 'zod';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Translates anything thrown anywhere in the app into the one error envelope
 * the client understands:
 *
 *   { success: false, error: { code, message, details? } }
 *
 * Unknown errors are logged in full but reported as a generic 500 — stack
 * traces and driver messages never reach the browser in production.
 */
export const errorHandler = (error, req, res, _next) => {
  let normalised = error;

  // --- Zod: field-level validation -------------------------------------
  if (error instanceof ZodError) {
    normalised = new ApiError(422, 'Some fields need another look.', {
      code: 'VALIDATION_ERROR',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.') || '_',
        message: issue.message,
      })),
    });
  }

  // --- Mongoose: schema validation --------------------------------------
  else if (error instanceof mongoose.Error.ValidationError) {
    normalised = new ApiError(422, 'Some fields need another look.', {
      code: 'VALIDATION_ERROR',
      details: Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    });
  }

  // --- Mongoose: malformed ObjectId in the path -------------------------
  else if (error instanceof mongoose.Error.CastError) {
    normalised = ApiError.notFound('We could not find that.');
  }

  // --- Mongo: unique index violation ------------------------------------
  else if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? { field: 1 })[0];
    const label = field === 'email' ? 'email address' : field;
    normalised = ApiError.conflict(`That ${label} is already taken.`, {
      code: 'DUPLICATE',
      details: [{ field, message: `That ${label} is already in use.` }],
    });
  }

  // --- Body parser: malformed JSON --------------------------------------
  else if (error?.type === 'entity.parse.failed') {
    normalised = ApiError.badRequest('That request body was not valid JSON.');
  }

  // --- Anything else is a bug -------------------------------------------
  else if (!(error instanceof ApiError)) {
    logger.error('Unhandled error', {
      method: req.method,
      path: req.originalUrl,
      message: error?.message,
      stack: error?.stack,
    });
    normalised = ApiError.internal();
  }

  const status = normalised.statusCode ?? 500;

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}`, normalised.message);
  }

  res.status(status).json({
    success: false,
    error: {
      code: normalised.code ?? 'ERROR',
      message: normalised.message,
      ...(normalised.details ? { details: normalised.details } : {}),
      ...(env.isProduction ? {} : { stack: error?.stack }),
    },
  });
};

export default errorHandler;
