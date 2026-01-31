import { logger } from "../../middleware/logger";
import { config } from "../../shared/config";
import { BEARER_PREFIX, FATHOM_API_TIMEOUT_MS } from "../../shared/constants";
import { authError, fathomApiError } from "../../shared/errors";
import type { ListMeetingsReqType } from "../../shared/schemas";
import { fetchFathomOAuthToken } from "../oauth/controller";
import {
  listMeetingsResSchema,
  listTeamMembersResSchema,
  listTeamsResSchema,
  summaryResSchema,
  transcriptResSchema,
  type ListMeetingsResType,
  type ListTeamMembersResType,
  type ListTeamsResType,
  type SummaryResType,
  type TranscriptResType,
} from "./schema";

export class FathomAPIClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async getRequest(endpoint: string): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      FATHOM_API_TIMEOUT_MS,
    );

    try {
      const response = await fetch(`${config.fathom.apiBaseUrl}${endpoint}`, {
        headers: {
          Authorization: `${BEARER_PREFIX}${this.accessToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(
          { endpoint, status: response.status, errorBody },
          "Fathom API error",
        );
        throw fathomApiError(
          `Fathom API returned error ${response.status}`,
          `fathom_api_${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw fathomApiError("Fathom API request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildReqQuery(
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
    const query = this.buildReqQuery({
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
    const data = await this.getRequest(`/meetings${query}`);
    return listMeetingsResSchema.parse(data);
  }

  async getTranscript(recordingId: string): Promise<TranscriptResType> {
    const data = await this.getRequest(`/recordings/${recordingId}/transcript`);
    return transcriptResSchema.parse(data);
  }

  async getSummary(recordingId: string): Promise<SummaryResType> {
    const data = await this.getRequest(`/recordings/${recordingId}/summary`);
    return summaryResSchema.parse(data);
  }

  async listTeams(cursor?: string): Promise<ListTeamsResType> {
    const query = this.buildReqQuery({ cursor });
    const data = await this.getRequest(`/teams${query}`);
    return listTeamsResSchema.parse(data);
  }

  async listTeamMembers(
    teamName?: string,
    cursor?: string,
  ): Promise<ListTeamMembersResType> {
    const query = this.buildReqQuery({ team: teamName, cursor });
    const data = await this.getRequest(`/team_members${query}`);
    return listTeamMembersResSchema.parse(data);
  }

  static async createAuthorizedService(
    userId: string,
  ): Promise<FathomAPIClient> {
    const accessToken = await fetchFathomOAuthToken(userId);

    if (!accessToken) {
      throw authError(
        "no_fathom_account",
        "No Fathom account connected. Please connect via Claude Settings > Connectors.",
      );
    }

    return new FathomAPIClient(accessToken);
  }
}
