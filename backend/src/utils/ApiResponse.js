/**
 * Every successful response has the same envelope, so the client only ever
 * writes one unwrapping path: { success: true, data, message? , meta? }.
 */
export const ok = (res, data, { message, meta, status = 200 } = {}) =>
  res.status(status).json({
    success: true,
    ...(message ? { message } : {}),
    data,
    ...(meta ? { meta } : {}),
  });

export const created = (res, data, options = {}) => ok(res, data, { ...options, status: 201 });

export const noContent = (res) => res.status(204).end();

export default { ok, created, noContent };
