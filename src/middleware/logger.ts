import { IncomingMessage, ServerResponse } from "http";
import pino from "pino";
import pinoHttp, { ReqId } from "pino-http";
import { config } from "../shared/config";

let requestCounter = 0;

function generateRequestId(): ReqId {
  requestCounter += 1;
  return requestCounter;
}

const developmentConfig = {
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      singleLine: true,
      ignore: "pid,hostname",
      translateTime: "HH:MM:ss.l",
    },
  },
};

const productionConfig = {
  level: "info",
};

export const logger = pino(
  config.nodeEnv === "production" ? productionConfig : developmentConfig,
);

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
