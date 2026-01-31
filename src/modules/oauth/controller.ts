import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { config } from "../../shared/config";
import {
  FATHOM_API_SCOPE,
  OAUTH_GRANT_TYPE_AUTH_CODE,
  OAUTH_GRANT_TYPE_REFRESH,
  OAUTH_RESPONSE_TYPE_CODE,
} from "../../shared/constants";
import { ErrorLogger } from "../../shared/errors";
import { decrypt } from "../../utils/crypto";
import type { FathomTokenResType } from "./schema";
import {
  authorizeClientAndRedirectToFathomReqSchema,
  completeFathomAuthAndRedirectClientReqSchema,
  exchangeCodeForMcpAccessTokenReqSchema,
  fathomTokenResSchema,
  registerMcpServerOAuthClientReqSchema,
} from "./schema";
import {
  consumeMcpServerAuthorizationCode,
  createMcpServerAccessToken,
  createMcpServerAuthorizationCode,
  createMcpServerOAuthState,
  deleteMcpServerOAuthState,
  findMcpServerOAuthClient,
  getFathomOAuthToken,
  getMcpServerOAuthState,
  insertFathomToken,
  insertMcpServerOAuthClient,
  verifyMcpServerPKCE,
} from "./service";

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
    throw ErrorLogger.oauth("invalid_client", "Unknown client_id");
  }

  if (!mcpServerClient.redirectUris.includes(redirect_uri)) {
    throw ErrorLogger.oauth(
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
    throw ErrorLogger.oauth(
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
    throw ErrorLogger.oauth(
      "invalid_grant",
      "Invalid, expired, or already used authorization code",
    );
  }
  const { clientCodeChallenge, clientCodeChallengeMethod, userId, scope } =
    authorizationCodeRecord;

  if (clientCodeChallenge && clientCodeChallengeMethod) {
    if (!code_verifier) {
      throw ErrorLogger.validation("Missing code_verifier for MCP Server PKCE");
    }

    const isValid = verifyMcpServerPKCE(
      code_verifier,
      clientCodeChallenge,
      clientCodeChallengeMethod,
    );

    if (!isValid) {
      throw ErrorLogger.oauth(
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

export async function fetchFathomOAuthToken(
  userId: string,
): Promise<string | null> {
  const stored = await getFathomOAuthToken(userId);

  if (!stored) {
    return null;
  }

  const decryptedAccessToken = decrypt(stored.accessToken);

  if (stored.expiresAt > new Date()) {
    return decryptedAccessToken;
  }

  const decryptedRefreshToken = decrypt(stored.refreshToken);
  const refreshed = await refreshFathomToken(decryptedRefreshToken);
  await insertFathomToken(userId, refreshed);
  return refreshed.access_token;
}

export async function exchangeCodeForFathomToken(
  code: string,
): Promise<FathomTokenResType> {
  const oauthUrl = `${config.fathom.oauthBaseUrl}/external/v1/oauth2/token`;
  const response = await fetch(oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: OAUTH_GRANT_TYPE_AUTH_CODE,
      code,
      client_id: config.fathom.clientId,
      client_secret: config.fathom.clientSecret,
      redirect_uri: config.fathom.redirectUrl,
    }),
  });

  if (!response.ok) {
    throw ErrorLogger.fathomApi("Failed to exchange authorization code");
  }

  const data = await response.json();
  return fathomTokenResSchema.parse(data);
}

export async function refreshFathomToken(
  refreshToken: string,
): Promise<FathomTokenResType> {
  const oauthUrl = `${config.fathom.oauthBaseUrl}/external/v1/oauth2/token`;
  const response = await fetch(oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: OAUTH_GRANT_TYPE_REFRESH,
      refresh_token: refreshToken,
      client_id: config.fathom.clientId,
      client_secret: config.fathom.clientSecret,
    }),
  });

  if (!response.ok) {
    throw ErrorLogger.fathomApi(
      "Fathom session expired or was revoked. Please reconnect via Claude Settings > Connectors.",
    );
  }

  const data = await response.json();
  return fathomTokenResSchema.parse(data);
}

export function buildFathomOAuthAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.fathom.clientId,
    redirect_uri: config.fathom.redirectUrl,
    response_type: OAUTH_RESPONSE_TYPE_CODE,
    scope: FATHOM_API_SCOPE,
    state,
  });
  return `${config.fathom.oauthBaseUrl}/external/v1/oauth2/authorize?${params}`;
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
