/**
 * Runs a Zod schema against the request and *replaces* the request segment
 * with the parsed result.
 *
 * That replacement is deliberate: because every schema is a strict whitelist,
 * unknown keys are stripped before a controller ever sees them. A client
 * cannot smuggle `{ xp: 9999, beans: 9999, level: 99 }` into a task update —
 * those keys simply cease to exist at the edge.
 */
export const validate = (schema, segment = 'body') => (req, _res, next) => {
  try {
    const parsed = schema.parse(req[segment]);
    if (segment === 'query') {
      // Express 5 exposes `req.query` as a getter; assign onto a shadow field.
      req.validatedQuery = parsed;
    } else {
      req[segment] = parsed;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default validate;
