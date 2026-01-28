import { config } from '../../common/config';
import { db, oauthTokens } from '../../db';
import { eq } from 'drizzle-orm';
import type {
  FathomTokenResponseType,
  ListMeetingsParamsType,
  ListMeetingsResponseType,
  TranscriptResponseType,
  SummaryResponseType,
  ListTeamsResponseType,
  ListTeamMembersResponseType,
} from './schema';

export class FathomService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${config.fathom.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fathom API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async listMeetings(params?: ListMeetingsParamsType): Promise<ListMeetingsResponseType> {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.created_after) searchParams.set('created_after', params.created_after);
    if (params?.created_before) searchParams.set('created_before', params.created_before);
    if (params?.include_transcript) searchParams.set('include_transcript', 'true');
    if (params?.include_summary) searchParams.set('include_summary', 'true');
    if (params?.recorded_by) {
      params.recorded_by.forEach((email) => searchParams.append('recorded_by[]', email));
    }

    const query = searchParams.toString();
    return this.request<ListMeetingsResponseType>(`/meetings${query ? `?${query}` : ''}`);
  }

  async getTranscript(recordingId: string): Promise<TranscriptResponseType> {
    return this.request<TranscriptResponseType>(`/recordings/${recordingId}/transcript`);
  }

  async getSummary(recordingId: string): Promise<SummaryResponseType> {
    return this.request<SummaryResponseType>(`/recordings/${recordingId}/summary`);
  }

  async listTeams(): Promise<ListTeamsResponseType> {
    return this.request<ListTeamsResponseType>('/teams');
  }

  async listTeamMembers(teamId: string): Promise<ListTeamMembersResponseType> {
    return this.request<ListTeamMembersResponseType>(`/teams/${teamId}/members`);
  }

  // Static OAuth methods
  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.fathom.clientId,
      redirect_uri: config.fathom.redirectUrl,
      response_type: 'code',
      scope: 'public_api',
      state,
    });
    return `${config.fathom.authUrl}/oauth/authorize?${params}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<FathomTokenResponseType> {
    const response = await fetch(`${config.fathom.authUrl}/external/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.fathom.clientId,
        client_secret: config.fathom.clientSecret,
        redirect_uri: config.fathom.redirectUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    return response.json();
  }

  static async refreshTokens(refreshToken: string): Promise<FathomTokenResponseType> {
    const response = await fetch(`${config.fathom.authUrl}/external/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.fathom.clientId,
        client_secret: config.fathom.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    return response.json();
  }

  // Token storage methods
  static async storeTokens(
    claudeUserId: string,
    tokens: FathomTokenResponseType
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await db
      .insert(oauthTokens)
      .values({
        claudeUserId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: oauthTokens.claudeUserId,
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          updatedAt: new Date(),
        },
      });
  }

  static async getStoredTokens(claudeUserId: string) {
    const result = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.claudeUserId, claudeUserId))
      .limit(1);

    return result[0] ?? null;
  }

  static async getValidAccessToken(claudeUserId: string): Promise<string | null> {
    const stored = await this.getStoredTokens(claudeUserId);

    if (!stored) {
      return null;
    }

    const isExpired = stored.expiresAt < new Date();

    if (!isExpired) {
      return stored.accessToken;
    }

    const refreshed = await this.refreshTokens(stored.refreshToken);
    await this.storeTokens(claudeUserId, refreshed);

    return refreshed.access_token;
  }
}
