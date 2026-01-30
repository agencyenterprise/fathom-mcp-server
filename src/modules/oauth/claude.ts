import { createHash, randomUUID } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  authorizationCodes,
  db,
  oauthClients,
  oauthStates,
  serverAccessTokens,
} from "../../db";
import {
  ACCESS_TOKEN_TTL_MS,
  AUTH_CODE_TTL_MS,
  DEFAULT_SCOPE,
  OAUTH_STATE_TTL_MS,
} from "../../shared/constants";
import type { claudeOAuthStateReqType } from "./schema";

export async function createClaudeClient(
  redirectUris: string[],
  clientName?: string,
): Promise<{ clientId: string }> {
  const clientId = randomUUID();

  await db.insert(oauthClients).values({
    clientId,
    clientName,
    redirectUris,
  });

  return { clientId };
}

export async function findClaudeClient(clientId: string) {
  const result = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);

  return result[0] ?? null;
}

export async function createClaudeState(
  params: claudeOAuthStateReqType,
): Promise<string> {
  const state = randomUUID();
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);

  await db.insert(oauthStates).values({
    state,
    clientId: params.clientId,
    claudeRedirectUri: params.redirectUri,
    claudeState: params.state,
    claudeCodeChallenge: params.codeChallenge,
    claudeCodeChallengeMethod: params.codeChallengeMethod,
    expiresAt,
  });

  return state;
}

export async function getClaudeState(state: string) {
  const result = await db
    .select()
    .from(oauthStates)
    .where(
      and(eq(oauthStates.state, state), gt(oauthStates.expiresAt, new Date())),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function deleteClaudeState(state: string): Promise<void> {
  await db.delete(oauthStates).where(eq(oauthStates.state, state));
}

export async function createClaudeAuthCode(
  userId: string,
  clientId: string,
  claudeRedirectUri: string,
  claudeCodeChallenge: string | null,
  claudeCodeChallengeMethod: string | null,
  scope: string = DEFAULT_SCOPE,
): Promise<string> {
  const code = randomUUID();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);

  await db.insert(authorizationCodes).values({
    code,
    userId,
    clientId,
    claudeRedirectUri,
    claudeCodeChallenge,
    claudeCodeChallengeMethod,
    scope,
    expiresAt,
  });

  return code;
}

export async function consumeClaudeAuthCode(code: string) {
  return await db.transaction(async (tx) => {
    const result = await tx
      .select()
      .from(authorizationCodes)
      .where(
        and(
          eq(authorizationCodes.code, code),
          gt(authorizationCodes.expiresAt, new Date()),
          isNull(authorizationCodes.used),
        ),
      )
      .limit(1);

    const codeRecord = result[0];
    if (!codeRecord) {
      return null;
    }

    await tx
      .update(authorizationCodes)
      .set({ used: new Date() })
      .where(eq(authorizationCodes.code, code));

    return codeRecord;
  });
}

export async function createClaudeAccessToken(
  userId: string,
  scope: string,
): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);

  await db.insert(serverAccessTokens).values({
    token,
    userId,
    scope,
    expiresAt,
  });

  return token;
}

export async function getClaudeAccessToken(token: string) {
  const result = await db
    .select()
    .from(serverAccessTokens)
    .where(
      and(
        eq(serverAccessTokens.token, token),
        gt(serverAccessTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export function verifyPKCE(
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
