import { createHash, randomUUID } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import {
  accessTokens,
  authorizationCodes,
  db,
  oauthClients,
  oauthStates,
} from "../../db";
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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
    scope: string = "fathom:read",
  ): Promise<string> {
    const code = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

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

  static async getValidAuthorizationCode(code: string) {
    const result = await db
      .select()
      .from(authorizationCodes)
      .where(
        and(
          eq(authorizationCodes.code, code),
          gt(authorizationCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  static async markAuthorizationCodeUsed(code: string): Promise<void> {
    await db
      .update(authorizationCodes)
      .set({ used: new Date() })
      .where(eq(authorizationCodes.code, code));
  }

  static async createAccessToken(
    userId: string,
    scope: string,
  ): Promise<string> {
    const token = randomUUID();

    await db.insert(accessTokens).values({
      token,
      userId,
      scope,
    });

    return token;
  }

  static async getAccessToken(token: string) {
    const result = await db
      .select()
      .from(accessTokens)
      .where(eq(accessTokens.token, token))
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
}
