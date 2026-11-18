/**
 * Minimal fixed-window rate limiter for Socket.IO events.
 * Create one instance per socket per event inside the "connection" handler —
 * state lives in the closure and is garbage-collected when the socket goes away.
 *
 * @param {{ windowMs: number, max: number }} options
 * @returns {() => boolean} call once per event; returns false when over the limit
 */
export const createSocketRateLimiter = ({ windowMs, max }) => {
  let windowStart = Date.now();
  let count = 0;

  return () => {
    const now = Date.now();
    if (now - windowStart >= windowMs) {
      windowStart = now;
      count = 0;
    }
    count += 1;
    return count <= max;
  };
};
