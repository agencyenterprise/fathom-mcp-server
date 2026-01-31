import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { oauthError, validationError } from "../../shared/errors";
import {
  buildFathomOAuthAuthorizationUrl,
  exchangeCodeForFathomToken,
  insertFathomToken,
} from "../fathom/oauth";
import {
  consumeMcpServerAuthorizationCode,
  createMcpServerAccessToken,
  createMcpServerAuthorizationCode,
  createMcpServerOAuthState,
  deleteMcpServerOAuthState,
  findMcpServerOAuthClient,
  getMcpServerOAuthState,
  insertMcpServerOAuthClient,
  verifyMcpServerPKCE,
} from "./oauth";
import {
  authorizeClientAndRedirectToFathomReqSchema,
  completeFathomAuthAndRedirectClientReqSchema,
  exchangeCodeForMcpAccessTokenReqSchema,
  registerMcpServerOAuthClientReqSchema,
} from "./schema";

export async function registerMcpServerOAuthClient(
  req: Request,
  res: Response,
) {
  const { redirect_uris, client_name } =
    registerMcpServerOAuthClientReqSchema.parse(req.body);

  const { clientId } = await insertMcpServerOAuthClient(
    redirect_uris,
    client_name,
  );

  res.status(201).json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris,
    client_name,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
  });
}

export async function authorizeClientAndRedirectToFathom(
  req: Request,
  res: Response,
) {
  const {
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
  } = authorizeClientAndRedirectToFathomReqSchema.parse(req.query);

  const mcpServerClient = await findMcpServerOAuthClient(client_id);
  if (!mcpServerClient) {
    throw oauthError("invalid_client", "Unknown client_id");
  }

  if (!mcpServerClient.redirectUris.includes(redirect_uri)) {
    throw oauthError(
      "invalid_mcp_server_client_redirect_uri",
      "mcp_server_client_redirect_uri not registered for this client",
    );
  }

  const mcpServerOAuthState = await createMcpServerOAuthState(
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
  );

  const fathomOAuthAuthorizationUrl =
    buildFathomOAuthAuthorizationUrl(mcpServerOAuthState);
  res.redirect(fathomOAuthAuthorizationUrl);
}

export async function completeFathomAuthAndRedirectClient(
  req: Request,
  res: Response,
) {
  const { code, state } = completeFathomAuthAndRedirectClientReqSchema.parse(
    req.query,
  );
  const mcpServerOAuthState = await getMcpServerOAuthState(state);

  if (!mcpServerOAuthState) {
    throw oauthError(
      "invalid_mcp_server_state",
      "Invalid or expired MCP Server state parameter",
    );
  }

  const {
    clientId,
    clientRedirectUri,
    clientCodeChallenge,
    clientCodeChallengeMethod,
    clientState,
  } = mcpServerOAuthState;

  const token = await exchangeCodeForFathomToken(code);
  const userId = randomUUID();
  await insertFathomToken(userId, token);

  await deleteMcpServerOAuthState(state);

  const mcpServerAuthorizationCode = await createMcpServerAuthorizationCode(
    userId,
    clientId,
    clientRedirectUri,
    clientCodeChallenge,
    clientCodeChallengeMethod,
  );

  const clientRedirectUrl = buildMcpServerOAuthRedirectUrl(
    clientRedirectUri,
    mcpServerAuthorizationCode,
    clientState,
  );
  res.redirect(clientRedirectUrl);
}

export async function exchangeCodeForMcpAccessToken(
  req: Request,
  res: Response,
) {
  const { code, code_verifier } = exchangeCodeForMcpAccessTokenReqSchema.parse(
    req.body,
  );

  const authorizationCodeRecord = await consumeMcpServerAuthorizationCode(code);
  if (!authorizationCodeRecord) {
    throw oauthError(
      "invalid_grant",
      "Invalid, expired, or already used authorization code",
    );
  }
  const { clientCodeChallenge, clientCodeChallengeMethod, userId, scope } =
    authorizationCodeRecord;

  if (clientCodeChallenge && clientCodeChallengeMethod) {
    if (!code_verifier) {
      throw validationError("Missing code_verifier for MCP Server PKCE");
    }

    const isValid = verifyMcpServerPKCE(
      code_verifier,
      clientCodeChallenge,
      clientCodeChallengeMethod,
    );

    if (!isValid) {
      throw oauthError(
        "invalid_grant",
        "Invalid code_verifier for MCP Server PKCE",
      );
    }
  }

  const mcpServerAccessToken = await createMcpServerAccessToken(userId, scope);

  res.json({
    access_token: mcpServerAccessToken,
    token_type: "Bearer",
    scope,
  });
}

function buildMcpServerOAuthRedirectUrl(
  clientRedirectUri: string,
  mcpServerAuthorizationCode: string,
  clientState: string,
): string {
  const mcpServerOAuthRedirectUrl = new URL(clientRedirectUri);
  mcpServerOAuthRedirectUrl.searchParams.set(
    "code",
    mcpServerAuthorizationCode,
  );
  mcpServerOAuthRedirectUrl.searchParams.set("state", clientState);

  return `/oauth-success.html?redirect=${encodeURIComponent(mcpServerOAuthRedirectUrl.toString())}`;
}
