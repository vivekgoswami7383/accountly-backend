import { MESSAGES, STATUS_CODES } from "../helpers/constants.js";

export const rateLimit = ({ windowMs, max }) => {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = String(req.user?._id || req.ip);
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(STATUS_CODES.TOO_MANY_REQUESTS).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.TOO_MANY_REQUESTS,
      });
    }
    next();
  };
};
