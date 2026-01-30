import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { bearerAuthMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import { logger, requestLogger } from "./middleware/logger";
import { userRateLimiter } from "./middleware/rateLimit";
import { SessionManager } from "./modules/mcp/sessions";
import {
  healthRouter,
  mcpRouter,
  oauthRouter,
  wellKnownRouter,
} from "./routes";
import { config } from "./shared/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Production: public/ copied to dist/public/ by build script
// Development: public/ at project root
const publicPath =
  config.nodeEnv === "production"
    ? path.join(__dirname, "public")
    : path.join(__dirname, "..", "public");

const app = express();
const sessionManager = new SessionManager();

app.locals.sessionManager = sessionManager;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));
app.use(requestLogger);

app.use("/health", healthRouter);
app.use("/.well-known", wellKnownRouter);
app.use("/oauth", oauthRouter);
app.use("/mcp", bearerAuthMiddleware, userRateLimiter, mcpRouter);

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
