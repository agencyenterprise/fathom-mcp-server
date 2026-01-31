import { createHash, randomUUID } from "crypto";
import { and, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import {
  db,
  fathomOAuthTokens,
  mcpServerAccessTokens,
  mcpServerAuthorizationCodes,
  mcpServerOAuthClients,
  mcpServerOAuthStates,
} from "../../db";
import {
  ACCESS_TOKEN_TTL_MS,
  AUTH_CODE_TTL_MS,
  DEFAULT_SCOPE,
  OAUTH_STATE_TTL_MS,
  STALE_TERMINATION_CUTOFF_MS,
} from "../../shared/constants";
import { encrypt } from "../../utils/crypto";
import type { FathomTokenResType } from "./schema";

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

export async function findMcpServerOAuthClient(clientId: string) {
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
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);

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

export async function getMcpServerOAuthState(state: string) {
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
  scope: string = DEFAULT_SCOPE,
): Promise<string> {
  const code = randomUUID();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);

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

export async function consumeMcpServerAuthorizationCode(code: string) {
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
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);

  await db.insert(mcpServerAccessTokens).values({
    token,
    userId,
    scope,
    expiresAt,
  });

  return token;
}

export async function getMcpServerAccessToken(token: string) {
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

export async function getFathomOAuthToken(userId: string) {
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
}> {
  const now = new Date();
  const staleUsedCodesCutoff = new Date(
    now.getTime() - STALE_TERMINATION_CUTOFF_MS,
  );

  const [statesResult, codesResult, tokensResult] = await Promise.all([
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
  ]);

  return {
    oauthStates: statesResult.rowCount ?? 0,
    authorizationCodes: codesResult.rowCount ?? 0,
    accessTokens: tokensResult.rowCount ?? 0,
  };
}
