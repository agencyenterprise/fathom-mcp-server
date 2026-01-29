import { randomUUID } from "crypto";
import { IncomingMessage } from "http";
import pino from "pino";
import pinoHttp from "pino-http";
import { config } from "../common/config";

export const logger = pino({
  level: config.nodeEnv === "production" ? "info" : "debug",
  transport: {
    target: "pino-pretty",
    options: { colorize: true, singleLine: true },
  },
});

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage) =>
    (req.headers["x-railway-request-id"] as string) ||
    (req.headers["x-request-id"] as string) ||
    randomUUID(),
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      ...(req.query &&
        Object.keys(req.query).length > 0 && { query: req.query }),
      ...(req.params &&
        Object.keys(req.params).length > 0 && { params: req.params }),
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 400 || err) return "error";
    return "info";
  },
});
