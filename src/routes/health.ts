import { sql } from "drizzle-orm";
import { Router } from "express";
import { config } from "../common/config";
import { db } from "../db";
import { logger } from "../middleware/logger";

const router = Router();

router.get("/", async (_req, res) => {
  let dbStatus = "ok";

  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    dbStatus = "error";
    logger.error({ error }, "Database health check failed");
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";
  const statusCode = dbStatus === "ok" ? 200 : 503;

  res.status(statusCode).json({
    status,
    service: "fathom-mcp",
    version: config.version,
    environment: config.nodeEnv,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export const healthRouter = router;
