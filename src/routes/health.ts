import { Router } from "express";
import { config } from "../common/config";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "fathom-mcp",
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

export const healthRouter = router;
