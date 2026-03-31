import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { bearerAuthMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import { logger, requestLogger } from "./middleware/logger";
import { userRateLimiter } from "./middleware/rateLimit";
import { SessionManager } from "./modules/sessions/manager";
import {
  docsRouter,
  healthRouter,
  mcpRouter,
  oauthRouter,
  sseConnectionRouter,
  sseMessageRouter,
  wellKnownRouter,
} from "./routes";
import { config } from "./shared/config";
import { GRACEFUL_SHUTDOWN_TIMEOUT_MS } from "./shared/constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const publicPath = path.join(__dirname, "public");

const app = express();
app.set("trust proxy", true);

const sessionManager = new SessionManager();
app.locals.sessionManager = sessionManager;
sessionManager.startCleanupScheduler();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== "production") {
  app.use((_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });
}

app.use(express.static(publicPath));
app.use(requestLogger);

app.use("/docs", docsRouter);
app.use("/health", healthRouter);
app.use("/.well-known", wellKnownRouter);
app.use("/oauth", oauthRouter);
app.use("/mcp", bearerAuthMiddleware, userRateLimiter, mcpRouter);
app.use("/sse", bearerAuthMiddleware, userRateLimiter, sseConnectionRouter);
app.use("/messages", bearerAuthMiddleware, userRateLimiter, sseMessageRouter);

// Block common attack vectors and malicious bots (Express 5 syntax)
app.use(
  [
    "/wp-admin/*path",
    "/wordpress/*path",
    "/wp-content/*path",
    "/wp-includes/*path",
  ],
  (_req, res) => {
    res.status(404).end();
  },
);

// Block PHP files (Express 5 syntax for files ending in .php)
app.use("/*path.php", (_req, res) => {
  res.status(404).end();
});

// Block other common malicious paths (Express 5 syntax)
app.use(
  ["/phpmyadmin/*path", "/admin/*path", "/.env*path", "/config/*path"],
  (_req, res) => {
    res.status(404).end();
  },
);

app.get("/api", (_req, res) => {
  res.json({
    name: "fathom-mcp",
    version: config.version,
    endpoints: {
      health: "/health",
      wellKnown: "/.well-known/oauth-protected-resource",
      oauth: "/oauth/authorize",
      mcp: "/mcp",
      sse: "/sse",
      sseMessages: "/messages",
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
  }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
