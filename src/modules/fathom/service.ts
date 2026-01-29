import { eq } from "drizzle-orm";
import { config } from "../../common/config";
import { db, oauthTokens } from "../../db";
import {
  fathomTokenResponseSchema,
  listMeetingsResponseSchema,
  listTeamMembersResponseSchema,
  listTeamsResponseSchema,
  summaryResponseSchema,
  transcriptResponseSchema,
  type FathomTokenResponseType,
  type ListMeetingsParamsType,
  type ListMeetingsResponseType,
  type ListTeamMembersResponseType,
  type ListTeamsResponseType,
  type SummaryResponseType,
  type TranscriptResponseType,
} from "./schema";

export class FathomService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetchJson(endpoint: string): Promise<unknown> {
    const response = await fetch(`${config.fathom.apiUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Fathom API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  private buildQueryString(
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    if (!params) return "";

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }

    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }

  async listMeetings(
    params?: ListMeetingsParamsType,
  ): Promise<ListMeetingsResponseType> {
    const query = this.buildQueryString({
      limit: params?.limit,
      cursor: params?.cursor,
      created_after: params?.created_after,
      created_before: params?.created_before,
      include_transcript: params?.include_transcript,
      include_summary: params?.include_summary,
    });
    const data = await this.fetchJson(`/meetings${query}`);
    return listMeetingsResponseSchema.parse(data);
  }

  async getTranscript(recordingId: string): Promise<TranscriptResponseType> {
    const data = await this.fetchJson(`/recordings/${recordingId}/transcript`);
    return transcriptResponseSchema.parse(data);
  }

  async getSummary(recordingId: string): Promise<SummaryResponseType> {
    const data = await this.fetchJson(`/recordings/${recordingId}/summary`);
    return summaryResponseSchema.parse(data);
  }

  async listTeams(): Promise<ListTeamsResponseType> {
    const data = await this.fetchJson("/teams");
    return listTeamsResponseSchema.parse(data);
  }

  async listTeamMembers(
    teamName?: string,
  ): Promise<ListTeamMembersResponseType> {
    const query = this.buildQueryString({ team: teamName });
    const data = await this.fetchJson(`/team_members${query}`);
    return listTeamMembersResponseSchema.parse(data);
  }

  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.fathom.clientId,
      redirect_uri: config.fathom.redirectUrl,
      response_type: "code",
      scope: "public_api",
      state,
    });
    return `${config.fathom.authUrl}/external/v1/oauth2/authorize?${params}`;
  }

  static async exchangeCodeForTokens(
    code: string,
  ): Promise<FathomTokenResponseType> {
    const response = await fetch(
      `${config.fathom.authUrl}/external/v1/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
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
    return fathomTokenResponseSchema.parse(data);
  }

  static async refreshTokens(
    refreshToken: string,
  ): Promise<FathomTokenResponseType> {
    const response = await fetch(
      `${config.fathom.authUrl}/external/v1/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: config.fathom.clientId,
          client_secret: config.fathom.clientSecret,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token refresh failed: ${errorBody}`);
    }

    const data = await response.json();
    return fathomTokenResponseSchema.parse(data);
  }

  static async storeTokens(
    userId: string,
    tokens: FathomTokenResponseType,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await db
      .insert(oauthTokens)
      .values({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: oauthTokens.userId,
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
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
        "No valid access token found. Please reconnect your Fathom account.",
      );
    }

    if (stored.expiresAt > new Date()) {
      return stored.accessToken;
    }

    const refreshed = await this.refreshTokens(stored.refreshToken);
    await this.storeTokens(userId, refreshed);
    return refreshed.access_token;
  }

  static async createAuthorizedService(userId: string): Promise<FathomService> {
    const accessToken = await this.getValidAccessToken(userId);
    return new FathomService(accessToken);
  }
}
