import { Router } from "express";
import { config } from "../shared/config";

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
    registration_endpoint: `${config.baseUrl}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256", "plain"],
    scopes_supported: ["fathom:read"],
  });
});

export const wellKnownRouter = router;
