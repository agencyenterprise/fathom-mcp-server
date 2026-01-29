import { NextFunction, Request, Response } from "express";
import pino from "pino";
import { config } from "../common/config";

export const logger = pino({
  level: config.nodeEnv === "production" ? "info" : "debug",
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

let requestId = 0;

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const id = ++requestId;
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "error" : "info";

    const logData: Record<string, unknown> = {
      id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    };

    if (Object.keys(req.query).length > 0) {
      logData.query = req.query;
    }

    if (Object.keys(req.params).length > 0) {
      logData.params = req.params;
    }

    logger[level](logData, "Request");
  });

  next();
}
