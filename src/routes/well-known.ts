import { Router } from "express";
import { config } from "../shared/config";
import {
  DEFAULT_SCOPE,
  OAUTH_GRANT_TYPE_AUTH_CODE,
  OAUTH_RESPONSE_TYPE_CODE,
} from "../shared/constants";

const router = Router();

router.get("/oauth-protected-resource", (_req, res) => {
  res.json({
    resource: `${config.baseUrl}/mcp`,
    authorization_servers: [config.baseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: [DEFAULT_SCOPE],
  });
});

router.get("/oauth-authorization-server", (_req, res) => {
  res.json({
    issuer: config.baseUrl,
    authorization_endpoint: `${config.baseUrl}/oauth/authorize`,
    token_endpoint: `${config.baseUrl}/oauth/token`,
    registration_endpoint: `${config.baseUrl}/oauth/register`,
    response_types_supported: [OAUTH_RESPONSE_TYPE_CODE],
    grant_types_supported: [OAUTH_GRANT_TYPE_AUTH_CODE],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256", "plain"],
    scopes_supported: [DEFAULT_SCOPE],
  });
});

export default router;
