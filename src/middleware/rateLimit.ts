import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import {
  MCP_RATE_LIMIT_MAX,
  OAUTH_RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from "../shared/constants";

export const userRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: MCP_RATE_LIMIT_MAX,
  keyGenerator: (req) => {
    if (req.userId) {
      return req.userId;
    }
    return ipKeyGenerator(req.ip ?? "unknown");
  },
  message: {
    error: "rate_limit_exceeded",
    error_description: `Too many requests. Limit: ${MCP_RATE_LIMIT_MAX} requests per minute.`,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const oauthRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: OAUTH_RATE_LIMIT_MAX,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: {
    error: "rate_limit_exceeded",
    error_description: "Too many authentication attempts. Try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
