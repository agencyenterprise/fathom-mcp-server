import { and, isNotNull, lt, or } from "drizzle-orm";
import {
  authorizationCodes,
  db,
  oauthStates,
  serverAccessTokens,
} from "../../db";
import { STALE_TERMINATION_CUTOFF_MS } from "../../shared/constants";

export * from "./claude";
export * from "./fathom";

export async function cleanupExpiredOAuthData(): Promise<{
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

    db
      .delete(serverAccessTokens)
      .where(lt(serverAccessTokens.expiresAt, now)),
  ]);

  return {
    oauthStates: statesResult.rowCount ?? 0,
    authorizationCodes: codesResult.rowCount ?? 0,
    accessTokens: tokensResult.rowCount ?? 0,
  };
}
