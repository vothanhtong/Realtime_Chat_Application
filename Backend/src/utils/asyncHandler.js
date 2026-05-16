/**
 * Wraps an async route handler to automatically catch errors
 * and forward them to Express error middleware — eliminates
 * repetitive try/catch boilerplate in every controller.
 *
 * @param {Function} fn - async (req, res, next) => {}
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
