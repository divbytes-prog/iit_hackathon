import ApiError from '../utils/ApiError.js';

/** Terminal handler for any route that did not match. */
export const notFound = (req, _res, next) => {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}.`));
};

export default notFound;
