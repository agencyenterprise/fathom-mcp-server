import express from "express";
import path from "path";
import pinoHttp from "pino-http";
import { fileURLToPath } from "url";
import { config } from "./common/config";
import {
  bearerAuthMiddleware,
  errorHandler,
  logger,
  userRateLimiter,
} from "./middleware";
import { SessionManager } from "./modules/mcp";
import { routes } from "./routes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const sessionManager = new SessionManager();

app.locals.sessionManager = sessionManager;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(pinoHttp({ logger }));

app.use("/health", routes.health);
app.use("/.well-known", routes.wellKnown);
app.use("/oauth", routes.oauth);
app.use("/mcp", bearerAuthMiddleware, userRateLimiter, routes.mcp);

app.get("/api", (_req, res) => {
  res.json({
    name: "fathom-mcp",
    version: config.version,
    endpoints: {
      health: "/health",
      wellKnown: "/.well-known/oauth-protected-resource",
      oauth: "/oauth/authorize",
      mcp: "/mcp",
    },
  });
});

app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      env: config.nodeEnv,
      baseUrl: config.baseUrl,
      version: config.version,
    },
    "Fathom MCP server started",
  );
});

sessionManager.startCleanupScheduler();

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received, closing server");

  await sessionManager.shutdown();

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
