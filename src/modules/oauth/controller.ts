import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { config } from "../../shared/config";
import {
  FATHOM_API_SCOPE,
  MCP_SERVER_ACCESS_TOKEN_TTL_MS,
  OAUTH_GRANT_TYPE_AUTH_CODE,
  OAUTH_GRANT_TYPE_REFRESH,
  OAUTH_RESPONSE_TYPE_CODE,
} from "../../shared/constants";
import { AppError } from "../../shared/errors";
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
  consumeMcpServerRefreshToken,
  createMcpServerAccessToken,
  createMcpServerAuthorizationCode,
  createMcpServerOAuthState,
  createMcpServerRefreshToken,
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
    throw AppError.oauth("invalid_client", "Unknown client_id");
  }

  if (!mcpServerClient.redirectUris.includes(redirect_uri)) {
    throw AppError.oauth(
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
    throw AppError.oauth(
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
  const parsed = exchangeCodeForMcpAccessTokenReqSchema.parse(req.body);

  if (parsed.grant_type === "refresh_token") {
    return handleRefreshTokenGrant(parsed.refresh_token, res);
  }

  return handleAuthorizationCodeGrant(parsed.code, parsed.code_verifier, res);
}

async function handleAuthorizationCodeGrant(
  code: string,
  codeVerifier: string | undefined,
  res: Response,
) {
  const authorizationCodeRecord = await consumeMcpServerAuthorizationCode(code);
  if (!authorizationCodeRecord) {
    throw AppError.oauth(
      "invalid_grant",
      "Invalid, expired, or already used authorization code",
    );
  }
  const { clientCodeChallenge, clientCodeChallengeMethod, userId, scope } =
    authorizationCodeRecord;

  if (clientCodeChallenge && clientCodeChallengeMethod) {
    if (!codeVerifier) {
      throw AppError.validation("Missing code_verifier for MCP Server PKCE");
    }

    const isValid = verifyMcpServerPKCE(
      codeVerifier,
      clientCodeChallenge,
      clientCodeChallengeMethod,
    );

    if (!isValid) {
      throw AppError.oauth(
        "invalid_grant",
        "Invalid code_verifier for MCP Server PKCE",
      );
    }
  }

  await issueTokenPair(userId, scope, res);
}

async function handleRefreshTokenGrant(refreshToken: string, res: Response) {
  const record = await consumeMcpServerRefreshToken(refreshToken);
  if (!record) {
    throw AppError.oauth(
      "invalid_grant",
      "Invalid, expired, or revoked refresh token",
    );
  }

  await issueTokenPair(record.userId, record.scope, res);
}

async function issueTokenPair(userId: string, scope: string, res: Response) {
  const accessToken = await createMcpServerAccessToken(userId, scope);
  const refreshToken = await createMcpServerRefreshToken(userId, scope);
  const expiresInSeconds = Math.floor(MCP_SERVER_ACCESS_TOKEN_TTL_MS / 1000);

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresInSeconds,
    refresh_token: refreshToken,
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
    throw AppError.fathomApi("Failed to exchange authorization code");
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
    throw AppError.fathomApi(
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

  return `/oauth/success?redirect=${encodeURIComponent(mcpServerOAuthRedirectUrl.toString())}`;
}
