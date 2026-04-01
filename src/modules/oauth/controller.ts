import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { config } from "../../shared/config";
import {
  FATHOM_API_SCOPE,
  MCP_SERVER_ACCESS_TOKEN_TTL_MS,
  OAUTH_GRANT_TYPE_AUTH_CODE,
  OAUTH_RESPONSE_TYPE_CODE,
} from "../../shared/constants";
import { AppError } from "../../shared/errors";
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
    grant_types: ["authorization_code", "refresh_token"],
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
  const body = exchangeCodeForMcpAccessTokenReqSchema.parse(req.body);

  if (body.grant_type === "refresh_token") {
    return await refreshMcpAccessToken(body.refresh_token, body.client_id, res);
  }

  return await issueAccessTokenFromAuthCode(body, res);
}

async function issueAccessTokenFromAuthCode(
  body: {
    grant_type: "authorization_code";
    code: string;
    client_id?: string;
    redirect_uri?: string;
    code_verifier?: string;
  },
  res: Response,
) {
  const authorizationCodeRecord = await consumeMcpServerAuthorizationCode(
    body.code,
  );
  if (!authorizationCodeRecord) {
    throw AppError.oauth(
      "invalid_grant",
      "Invalid, expired, or already used authorization code",
    );
  }

  const {
    clientCodeChallenge,
    clientCodeChallengeMethod,
    clientId,
    userId,
    scope,
  } = authorizationCodeRecord;

  if (clientCodeChallenge && clientCodeChallengeMethod) {
    if (!body.code_verifier) {
      throw AppError.validation("Missing code_verifier for MCP Server PKCE");
    }

    const isValid = verifyMcpServerPKCE(
      body.code_verifier,
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

  const [accessToken, refreshToken] = await Promise.all([
    createMcpServerAccessToken(userId, scope),
    createMcpServerRefreshToken(userId, clientId, scope),
  ]);

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(MCP_SERVER_ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: refreshToken,
    scope,
  });
}

async function refreshMcpAccessToken(
  token: string,
  clientId: string,
  res: Response,
) {
  const refreshTokenRecord = await consumeMcpServerRefreshToken(token);
  if (!refreshTokenRecord) {
    throw AppError.oauth("invalid_grant", "Invalid or expired refresh token");
  }

  if (refreshTokenRecord.clientId !== clientId) {
    throw AppError.oauth(
      "invalid_grant",
      "Refresh token was not issued to this client",
    );
  }

  const { userId, scope } = refreshTokenRecord;

  const [newAccessToken, newRefreshToken] = await Promise.all([
    createMcpServerAccessToken(userId, scope),
    createMcpServerRefreshToken(userId, clientId, scope),
  ]);

  res.json({
    access_token: newAccessToken,
    token_type: "Bearer",
    expires_in: Math.floor(MCP_SERVER_ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: newRefreshToken,
    scope,
  });
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
