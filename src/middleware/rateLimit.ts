import { ipKeyGenerator, rateLimit } from "express-rate-limit";

export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    if (req.userId) {
      return req.userId;
    }
    return ipKeyGenerator(req.ip ?? "unknown");
  },
  message: {
    error: "rate_limit_exceeded",
    error_description: "Too many requests. Limit: 60 requests per minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
