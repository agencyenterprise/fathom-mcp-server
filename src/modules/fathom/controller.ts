import type { ListMeetingsParamsType } from "./schema";
import { FathomService } from "./service";

export class FathomController {
  static async listMeetings(
    claudeUserId: string,
    params?: ListMeetingsParamsType,
  ) {
    try {
      const accessToken = await FathomService.getValidAccessToken(claudeUserId);

      if (!accessToken) {
        throw new Error(
          "No valid access token found. Please reconnect your Fathom account.",
        );
      }

      const service = new FathomService(accessToken);
      const response = await service.listMeetings(params);

      return {
        success: true as const,
        data: response,
      };
    } catch (error) {
      return {
        success: false as const,
        error:
          error instanceof Error ? error.message : "Failed to list meetings",
      };
    }
  }

  static async getTranscript(claudeUserId: string, recordingId: string) {
    try {
      const accessToken = await FathomService.getValidAccessToken(claudeUserId);

      if (!accessToken) {
        throw new Error(
          "No valid access token found. Please reconnect your Fathom account.",
        );
      }

      const service = new FathomService(accessToken);
      const response = await service.getTranscript(recordingId);

      return {
        success: true as const,
        data: response,
      };
    } catch (error) {
      return {
        success: false as const,
        error:
          error instanceof Error ? error.message : "Failed to get transcript",
      };
    }
  }

  static async getSummary(claudeUserId: string, recordingId: string) {
    try {
      const accessToken = await FathomService.getValidAccessToken(claudeUserId);

      if (!accessToken) {
        throw new Error(
          "No valid access token found. Please reconnect your Fathom account.",
        );
      }

      const service = new FathomService(accessToken);
      const response = await service.getSummary(recordingId);

      return {
        success: true as const,
        data: response,
      };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to get summary",
      };
    }
  }

  static async listTeams(claudeUserId: string) {
    try {
      const accessToken = await FathomService.getValidAccessToken(claudeUserId);

      if (!accessToken) {
        throw new Error(
          "No valid access token found. Please reconnect your Fathom account.",
        );
      }

      const service = new FathomService(accessToken);
      const response = await service.listTeams();

      return {
        success: true as const,
        data: response,
      };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to list teams",
      };
    }
  }

  static async listTeamMembers(claudeUserId: string, teamId: string) {
    try {
      const accessToken = await FathomService.getValidAccessToken(claudeUserId);

      if (!accessToken) {
        throw new Error(
          "No valid access token found. Please reconnect your Fathom account.",
        );
      }

      const service = new FathomService(accessToken);
      const response = await service.listTeamMembers(teamId);

      return {
        success: true as const,
        data: response,
      };
    } catch (error) {
      return {
        success: false as const,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list team members",
      };
    }
  }

  static async handleOAuthCallback(code: string, claudeUserId: string) {
    try {
      const tokens = await FathomService.exchangeCodeForTokens(code);
      await FathomService.storeTokens(claudeUserId, tokens);

      return {
        success: true as const,
      };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "OAuth callback failed",
      };
    }
  }
}
