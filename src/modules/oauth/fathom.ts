import { eq } from "drizzle-orm";
import { db, fathomOAuthTokens } from "../../db";
import { config } from "../../shared/config";
import {
  FATHOM_API_SCOPE,
  OAUTH_GRANT_TYPE_AUTH_CODE,
  OAUTH_GRANT_TYPE_REFRESH,
  OAUTH_RESPONSE_TYPE_CODE,
} from "../../shared/constants";
import { authError, fathomApiError } from "../../shared/errors";
import { decrypt, encrypt } from "../../utils/crypto";
import { fathomTokenResSchema, type FathomTokenResType } from "./schema";

export function getFathomAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.fathom.clientId,
    redirect_uri: config.fathom.redirectUrl,
    response_type: OAUTH_RESPONSE_TYPE_CODE,
    scope: FATHOM_API_SCOPE,
    state,
  });
  return `${config.fathom.authUrl}/external/v1/oauth2/authorize?${params}`;
}

export async function exchangeCodeForFathomTokens(
  code: string,
): Promise<FathomTokenResType> {
  const response = await fetch(
    `${config.fathom.authUrl}/external/v1/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: OAUTH_GRANT_TYPE_AUTH_CODE,
        code,
        client_id: config.fathom.clientId,
        client_secret: config.fathom.clientSecret,
        redirect_uri: config.fathom.redirectUrl,
      }),
    },
  );

  if (!response.ok) {
    throw fathomApiError("Failed to exchange authorization code");
  }

  const data = await response.json();
  return fathomTokenResSchema.parse(data);
}

export async function refreshFathomTokens(
  refreshToken: string,
): Promise<FathomTokenResType> {
  const response = await fetch(
    `${config.fathom.authUrl}/external/v1/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: OAUTH_GRANT_TYPE_REFRESH,
        refresh_token: refreshToken,
        client_id: config.fathom.clientId,
        client_secret: config.fathom.clientSecret,
      }),
    },
  );

  if (!response.ok) {
    throw fathomApiError(
      "Fathom session expired or was revoked. Please reconnect via Claude Settings > Connectors.",
    );
  }

  const data = await response.json();
  return fathomTokenResSchema.parse(data);
}

export async function storeFathomTokens(
  userId: string,
  tokens: FathomTokenResType,
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const encryptedAccessToken = encrypt(tokens.access_token);
  const encryptedRefreshToken = encrypt(tokens.refresh_token);

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

export async function getValidFathomAccessToken(
  userId: string,
): Promise<string> {
  const result = await db
    .select()
    .from(fathomOAuthTokens)
    .where(eq(fathomOAuthTokens.userId, userId))
    .limit(1);

  const stored = result[0];

  if (!stored) {
    throw authError(
      "no_fathom_account",
      "No Fathom account connected. Please connect via Claude Settings > Connectors.",
    );
  }

  const decryptedAccessToken = decrypt(stored.accessToken);

  if (stored.expiresAt > new Date()) {
    return decryptedAccessToken;
  }

  const decryptedRefreshToken = decrypt(stored.refreshToken);
  const refreshed = await refreshFathomTokens(decryptedRefreshToken);
  await storeFathomTokens(userId, refreshed);
  return refreshed.access_token;
}
