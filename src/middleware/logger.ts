import type { IncomingMessage, ServerResponse } from "http";
import pino from "pino";
import type { ReqId } from "pino-http";
import pinoHttp from "pino-http";
import { config } from "../shared/config";

let requestCounter = 0;

function generateRequestId(): ReqId {
  requestCounter += 1;
  return requestCounter;
}

const isStaging = config.nodeEnv === "staging";

export const logger = pino({
  level: isStaging ? "debug" : "info",
  ...(isStaging && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: true,
        ignore: "pid,hostname",
        translateTime: "HH:MM:ss.l",
      },
    },
  }),
});

export const requestLogger = pinoHttp({
  logger,
  genReqId: generateRequestId,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  customLogLevel: (
    _req: IncomingMessage,
    res: ServerResponse,
    err: Error | undefined,
  ) => {
    if (res.statusCode >= 400 || err) return "error";
    return "info";
  },
});
