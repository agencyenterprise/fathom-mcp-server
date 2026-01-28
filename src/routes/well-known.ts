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

router.get("/oauth-authorization-server", (_req, res) => {
  res.json({
    issuer: config.baseUrl,
    authorization_endpoint: `${config.baseUrl}/oauth/authorize`,
    token_endpoint: `${config.baseUrl}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256", "plain"],
    scopes_supported: ["fathom:read"],
  });
});

export const wellKnownRouter = router;
