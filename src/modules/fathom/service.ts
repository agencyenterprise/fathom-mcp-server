import { eq } from "drizzle-orm";
import { db, oauthTokens } from "../../db";
import { config } from "../../shared/config";
import {
  BEARER_PREFIX,
  FATHOM_API_SCOPE,
  FATHOM_API_TIMEOUT_MS,
  OAUTH_GRANT_TYPE_AUTH_CODE,
  OAUTH_GRANT_TYPE_REFRESH,
  OAUTH_RESPONSE_TYPE_CODE,
} from "../../shared/constants";
import type { ListMeetingsReqType } from "../../shared/schemas";
import { decrypt, encrypt } from "../../utils/crypto";
import {
  fathomTokenResSchema,
  listMeetingsResSchema,
  listTeamMembersResSchema,
  listTeamsResSchema,
  summaryResSchema,
  transcriptResSchema,
  type FathomTokenResType,
  type ListMeetingsResType,
  type ListTeamMembersResType,
  type ListTeamsResType,
  type SummaryResType,
  type TranscriptResType,
} from "./schema";

export class FathomService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetchJson(endpoint: string): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      FATHOM_API_TIMEOUT_MS,
    );

    try {
      const response = await fetch(`${config.fathom.apiUrl}${endpoint}`, {
        headers: {
          Authorization: `${BEARER_PREFIX}${this.accessToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Fathom API error ${response.status}: ${errorBody}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Fathom API request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildQueryString(
    params?: Record<string, string | number | boolean | string[] | undefined>,
  ): string {
    if (!params) return "";

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, item);
        }
      } else {
        searchParams.set(key, String(value));
      }
    }

    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }

  async listMeetings(
    params?: ListMeetingsReqType,
  ): Promise<ListMeetingsResType> {
    const query = this.buildQueryString({
      limit: params?.limit,
      cursor: params?.cursor,
      created_after: params?.created_after,
      created_before: params?.created_before,
      calendar_invitees_domains: params?.calendar_invitees_domains,
      calendar_invitees_domains_type: params?.calendar_invitees_domains_type,
      teams: params?.teams,
      recorded_by: params?.recorded_by,
      include_action_items: params?.include_action_items,
    });
    const data = await this.fetchJson(`/meetings${query}`);
    return listMeetingsResSchema.parse(data);
  }

  async getTranscript(recordingId: string): Promise<TranscriptResType> {
    const data = await this.fetchJson(`/recordings/${recordingId}/transcript`);
    return transcriptResSchema.parse(data);
  }

  async getSummary(recordingId: string): Promise<SummaryResType> {
    const data = await this.fetchJson(`/recordings/${recordingId}/summary`);
    return summaryResSchema.parse(data);
  }

  async listTeams(cursor?: string): Promise<ListTeamsResType> {
    const query = this.buildQueryString({ cursor });
    const data = await this.fetchJson(`/teams${query}`);
    return listTeamsResSchema.parse(data);
  }

  async listTeamMembers(
    teamName?: string,
    cursor?: string,
  ): Promise<ListTeamMembersResType> {
    const query = this.buildQueryString({ team: teamName, cursor });
    const data = await this.fetchJson(`/team_members${query}`);
    return listTeamMembersResSchema.parse(data);
  }

  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.fathom.clientId,
      redirect_uri: config.fathom.redirectUrl,
      response_type: OAUTH_RESPONSE_TYPE_CODE,
      scope: FATHOM_API_SCOPE,
      state,
    });
    return `${config.fathom.authUrl}/external/v1/oauth2/authorize?${params}`;
  }

  static async exchangeCodeForTokens(
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
      const errorBody = await response.text();
      throw new Error(`Token exchange failed: ${errorBody}`);
    }

    const data = await response.json();
    return fathomTokenResSchema.parse(data);
  }

  static async refreshTokens(
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
      const errorBody = await response.text();
      throw new Error(
        `Fathom session expired or was revoked. Please reconnect: go to Claude Settings > Connectors > Fathom MCP > Remove, then reconnect. (Details: ${errorBody})`,
      );
    }

    const data = await response.json();
    return fathomTokenResSchema.parse(data);
  }

  static async storeTokens(
    userId: string,
    tokens: FathomTokenResType,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    await db
      .insert(oauthTokens)
      .values({
        userId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: oauthTokens.userId,
        set: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
          updatedAt: new Date(),
        },
      });
  }

  static async getStoredTokens(userId: string) {
    const result = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.userId, userId))
      .limit(1);

    return result[0] ?? null;
  }

  static async getValidAccessToken(userId: string): Promise<string> {
    const stored = await this.getStoredTokens(userId);

    if (!stored) {
      throw new Error(
        "No Fathom account connected. Please connect: go to Claude Settings > Connectors > Add Custom Connector and authenticate with Fathom.",
      );
    }

    const decryptedAccessToken = decrypt(stored.accessToken);

    if (stored.expiresAt > new Date()) {
      return decryptedAccessToken;
    }

    const decryptedRefreshToken = decrypt(stored.refreshToken);
    const refreshed = await this.refreshTokens(decryptedRefreshToken);
    await this.storeTokens(userId, refreshed);
    return refreshed.access_token;
  }

  static async createAuthorizedService(userId: string): Promise<FathomService> {
    const accessToken = await this.getValidAccessToken(userId);
    return new FathomService(accessToken);
  }
}
