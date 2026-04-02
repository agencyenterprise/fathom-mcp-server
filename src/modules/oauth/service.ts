import { createHash, randomUUID } from "crypto";
import { and, eq, gt, isNotNull, isNull, lt, notInArray, or } from "drizzle-orm";
import {
  db,
  fathomOAuthTokens,
  mcpServerAccessTokens,
  mcpServerAuthorizationCodes,
  mcpServerOAuthClients,
  mcpServerOAuthStates,
  mcpServerRefreshTokens,
  type FathomOAuthToken,
  type McpServerAccessToken,
  type McpServerAuthorizationCode,
  type McpServerOAuthClient,
  type McpServerOAuthState,
  type McpServerRefreshToken,
} from "../../db";
import { config } from "../../shared/config";
import {
  MCP_SERVER_ACCESS_TOKEN_TTL_MS,
  MCP_SERVER_AUTH_CODE_TTL_MS,
  MCP_SERVER_DEFAULT_SCOPE,
  MCP_SERVER_OAUTH_STATE_TTL_MS,
  MCP_SERVER_REFRESH_TOKEN_TTL_MS,
  OAUTH_GRANT_TYPE_REFRESH,
  STALE_SESSION_CUTOFF_MS,
} from "../../shared/constants";
import { AppError } from "../../shared/errors";
import { decrypt, encrypt } from "../../utils/crypto";
import type { FathomTokenResType } from "./schema";
import { fathomTokenResSchema } from "./schema";

export async function insertMcpServerOAuthClient(
  redirectUris: string[],
  clientName?: string,
): Promise<{ clientId: string }> {
  const clientId = randomUUID();
  await db.insert(mcpServerOAuthClients).values({
    clientId,
    clientName,
    redirectUris,
  });
  return { clientId };
}

export async function findMcpServerOAuthClient(
  clientId: string,
): Promise<McpServerOAuthClient | null> {
  const result = await db
    .select()
    .from(mcpServerOAuthClients)
    .where(eq(mcpServerOAuthClients.clientId, clientId))
    .limit(1);

  return result[0] ?? null;
}

export async function createMcpServerOAuthState(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge?: string,
  codeChallengeMethod?: string,
): Promise<string> {
  const mcpServerOAuthState = randomUUID();
  const expiresAt = new Date(Date.now() + MCP_SERVER_OAUTH_STATE_TTL_MS);

  await db.insert(mcpServerOAuthStates).values({
    state: mcpServerOAuthState,
    clientId: clientId,
    clientRedirectUri: redirectUri,
    clientState: state,
    clientCodeChallenge: codeChallenge,
    clientCodeChallengeMethod: codeChallengeMethod,
    expiresAt,
  });

  return mcpServerOAuthState;
}

export async function getMcpServerOAuthState(
  state: string,
): Promise<McpServerOAuthState | null> {
  const result = await db
    .select()
    .from(mcpServerOAuthStates)
    .where(
      and(
        eq(mcpServerOAuthStates.state, state),
        gt(mcpServerOAuthStates.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function deleteMcpServerOAuthState(state: string): Promise<void> {
  await db
    .delete(mcpServerOAuthStates)
    .where(eq(mcpServerOAuthStates.state, state));
}

export async function createMcpServerAuthorizationCode(
  userId: string,
  clientId: string,
  clientRedirectUri: string,
  clientCodeChallenge: string | null,
  clientCodeChallengeMethod: string | null,
  scope: string = MCP_SERVER_DEFAULT_SCOPE,
): Promise<string> {
  const code = randomUUID();
  const expiresAt = new Date(Date.now() + MCP_SERVER_AUTH_CODE_TTL_MS);

  await db.insert(mcpServerAuthorizationCodes).values({
    code,
    userId,
    clientId,
    clientRedirectUri,
    clientCodeChallenge,
    clientCodeChallengeMethod,
    scope,
    expiresAt,
  });

  return code;
}

export async function consumeMcpServerAuthorizationCode(
  code: string,
): Promise<McpServerAuthorizationCode | null> {
  return await db.transaction(async (tx) => {
    const authorizationCodeRecords = await tx
      .select()
      .from(mcpServerAuthorizationCodes)
      .where(
        and(
          eq(mcpServerAuthorizationCodes.code, code),
          gt(mcpServerAuthorizationCodes.expiresAt, new Date()),
          isNull(mcpServerAuthorizationCodes.used),
        ),
      )
      .limit(1);

    const authorizationCodeRecord = authorizationCodeRecords[0];
    if (!authorizationCodeRecord) return null;

    await tx
      .update(mcpServerAuthorizationCodes)
      .set({ used: new Date() })
      .where(eq(mcpServerAuthorizationCodes.code, code));

    return authorizationCodeRecord;
  });
}

export async function createMcpServerAccessToken(
  userId: string,
  scope: string,
): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + MCP_SERVER_ACCESS_TOKEN_TTL_MS);

  await db.insert(mcpServerAccessTokens).values({
    token,
    userId,
    scope,
    expiresAt,
  });

  return token;
}

export async function createMcpServerRefreshToken(
  userId: string,
  clientId: string,
  scope: string,
): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + MCP_SERVER_REFRESH_TOKEN_TTL_MS);

  await db
    .insert(mcpServerRefreshTokens)
    .values({ token, userId, clientId, scope, expiresAt })
    .onConflictDoUpdate({
      target: [mcpServerRefreshTokens.userId, mcpServerRefreshTokens.clientId],
      set: { token, scope, expiresAt },
    });

  return token;
}

export async function consumeMcpServerRefreshToken(
  token: string,
): Promise<McpServerRefreshToken | null> {
  return await db.transaction(async (tx) => {
    const records = await tx
      .select()
      .from(mcpServerRefreshTokens)
      .where(
        and(
          eq(mcpServerRefreshTokens.token, token),
          gt(mcpServerRefreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const record = records[0];
    if (!record) return null;

    await tx
      .delete(mcpServerRefreshTokens)
      .where(eq(mcpServerRefreshTokens.token, token));

    return record;
  });
}

export async function getMcpServerAccessToken(
  token: string,
): Promise<McpServerAccessToken | null> {
  const accessTokenRecords = await db
    .select()
    .from(mcpServerAccessTokens)
    .where(
      and(
        eq(mcpServerAccessTokens.token, token),
        gt(mcpServerAccessTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return accessTokenRecords[0] ?? null;
}

export async function insertFathomToken(
  userId: string,
  token: FathomTokenResType,
): Promise<void> {
  const expiresAt = new Date(Date.now() + token.expires_in * 1000);
  const encryptedAccessToken = encrypt(token.access_token);
  const encryptedRefreshToken = encrypt(token.refresh_token);

  await db
    .insert(fathomOAuthTokens)
    .values({
      userId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: fathomOAuthTokens.userId,
      set: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function getFathomOAuthToken(
  userId: string,
): Promise<FathomOAuthToken | null> {
  const result = await db
    .select()
    .from(fathomOAuthTokens)
    .where(eq(fathomOAuthTokens.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export function verifyMcpServerPKCE(
  codeVerifier: string,
  codeChallenge: string,
  codeChallengeMethod: string,
): boolean {
  if (codeChallengeMethod === "S256") {
    const computedChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    return computedChallenge === codeChallenge;
  }
  return codeVerifier === codeChallenge;
}

export async function cleanupExpiredMcpServerOAuthData(): Promise<{
  oauthStates: number;
  authorizationCodes: number;
  accessTokens: number;
  refreshTokens: number;
  fathomTokens: number;
}> {
  const now = new Date();
  const staleUsedCodesCutoff = new Date(
    now.getTime() - STALE_SESSION_CUTOFF_MS,
  );

  const [
    statesResult,
    codesResult,
    tokensResult,
    refreshTokensResult,
    fathomTokensResult,
  ] = await Promise.all([
    db
      .delete(mcpServerOAuthStates)
      .where(lt(mcpServerOAuthStates.expiresAt, now)),

    db
      .delete(mcpServerAuthorizationCodes)
      .where(
        or(
          lt(mcpServerAuthorizationCodes.expiresAt, now),
          and(
            isNotNull(mcpServerAuthorizationCodes.used),
            lt(mcpServerAuthorizationCodes.used, staleUsedCodesCutoff),
          ),
        ),
      ),

    db
      .delete(mcpServerAccessTokens)
      .where(lt(mcpServerAccessTokens.expiresAt, now)),

    db
      .delete(mcpServerRefreshTokens)
      .where(lt(mcpServerRefreshTokens.expiresAt, now)),

    db.delete(fathomOAuthTokens).where(
      and(
        notInArray(
          fathomOAuthTokens.userId,
          db
            .select({ userId: mcpServerRefreshTokens.userId })
            .from(mcpServerRefreshTokens),
        ),
        notInArray(
          fathomOAuthTokens.userId,
          db
            .select({ userId: mcpServerAccessTokens.userId })
            .from(mcpServerAccessTokens),
        ),
      ),
    ),
  ]);

  return {
    oauthStates: statesResult.rowCount ?? 0,
    authorizationCodes: codesResult.rowCount ?? 0,
    accessTokens: tokensResult.rowCount ?? 0,
    refreshTokens: refreshTokensResult.rowCount ?? 0,
    fathomTokens: fathomTokensResult.rowCount ?? 0,
  };
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
