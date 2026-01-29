import { createHash, randomUUID } from "crypto";
import { and, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import {
  accessTokens,
  authorizationCodes,
  db,
  oauthClients,
  oauthStates,
} from "../../db";
import {
  ACCESS_TOKEN_TTL_MS,
  AUTH_CODE_TTL_MS,
  DEFAULT_SCOPE,
  OAUTH_STATE_TTL_MS,
  STALE_TERMINATION_CUTOFF_MS,
} from "../../shared/constants";
import type { CreateOAuthStateParamsType } from "./schema";

export class OAuthService {
  static async registerClient(
    redirectUris: string[],
    clientName?: string,
  ): Promise<{ clientId: string; clientSecret?: string }> {
    const clientId = randomUUID();

    await db.insert(oauthClients).values({
      clientId,
      clientName,
      redirectUris,
    });

    return { clientId };
  }

  static async getClient(clientId: string) {
    const result = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId))
      .limit(1);

    return result[0] ?? null;
  }

  static async createOAuthState(
    params: CreateOAuthStateParamsType,
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

  static async getValidOAuthState(state: string) {
    const result = await db
      .select()
      .from(oauthStates)
      .where(
        and(
          eq(oauthStates.state, state),
          gt(oauthStates.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  static async deleteOAuthState(state: string): Promise<void> {
    await db.delete(oauthStates).where(eq(oauthStates.state, state));
  }

  static async createAuthorizationCode(
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

  static async consumeAuthorizationCode(code: string) {
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

  static async createAccessToken(
    userId: string,
    scope: string,
  ): Promise<string> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);

    await db.insert(accessTokens).values({
      token,
      userId,
      scope,
      expiresAt,
    });

    return token;
  }

  static async getAccessToken(token: string) {
    const result = await db
      .select()
      .from(accessTokens)
      .where(
        and(
          eq(accessTokens.token, token),
          gt(accessTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  static verifyPKCE(
    codeVerifier: string,
    codeChallenge: string,
    codeChallengeMethod: string,
  ): boolean {
    let computedChallenge: string;

    if (codeChallengeMethod === "S256") {
      computedChallenge = createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");
    } else {
      computedChallenge = codeVerifier;
    }

    return computedChallenge === codeChallenge;
  }

  static async cleanupExpiredOAuthData(): Promise<{
    oauthStates: number;
    authorizationCodes: number;
    accessTokens: number;
  }> {
    const now = new Date();
    const staleUsedCodesCutoff = new Date(
      now.getTime() - STALE_TERMINATION_CUTOFF_MS,
    );

    const [statesResult, codesResult, tokensResult] = await Promise.all([
      db.delete(oauthStates).where(lt(oauthStates.expiresAt, now)),

      db
        .delete(authorizationCodes)
        .where(
          or(
            lt(authorizationCodes.expiresAt, now),
            and(
              isNotNull(authorizationCodes.used),
              lt(authorizationCodes.used, staleUsedCodesCutoff),
            ),
          ),
        ),

      db.delete(accessTokens).where(lt(accessTokens.expiresAt, now)),
    ]);

    return {
      oauthStates: statesResult.rowCount ?? 0,
      authorizationCodes: codesResult.rowCount ?? 0,
      accessTokens: tokensResult.rowCount ?? 0,
    };
  }
}
