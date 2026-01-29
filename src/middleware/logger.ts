import pino from "pino";
import { config } from "../common/config";

export const logger = pino({
  level: config.nodeEnv === "production" ? "info" : "debug",
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});
