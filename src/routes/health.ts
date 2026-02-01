import { sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import { logger } from "../middleware/logger";
import { config } from "../shared/config";

const router = Router();

router.get("/", async (_req, res) => {
  let dbStatus = "ok";
  let configStatus = "ok";
  const issues: string[] = [];

  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    dbStatus = "error";
    logger.error({ error }, "Database health check failed");
  }

  if (config.encryptionKey.length !== 32) {
    configStatus = "error";
    issues.push("TOKEN_ENCRYPTION_KEY is not 32 bytes");
  }

  const status =
    dbStatus === "ok" && configStatus !== "error" ? "ok" : "degraded";
  const statusCode = status === "ok" ? 200 : 503;

  res.status(statusCode).json({
    status,
    service: "fathom-mcp",
    version: config.version,
    environment: config.nodeEnv,
    checks: {
      database: dbStatus,
      configuration: configStatus,
    },
    ...(issues.length > 0 && { issues }),
    timestamp: new Date().toISOString(),
  });
});

export default router;
