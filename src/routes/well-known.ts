import { Router } from "express";
import { config } from "../common/config";

const router = Router();

router.get("/oauth-protected-resource", (_req, res) => {
  res.json({
    resource: `${config.baseUrl}/mcp`,
    authorization_servers: [config.baseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["fathom:read"],
  });
});

export const wellKnownRouter = router;
