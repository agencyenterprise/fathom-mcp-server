import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { FathomController } from "../fathom";
import type {
  GetSummaryInputType,
  GetTranscriptInputType,
  ListMeetingsInputType,
  ListTeamMembersInputType,
  SearchMeetingsInputType,
} from "./schema";

function formatToolResult(success: boolean, data: unknown): CallToolResult {
  if (success) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data),
      },
    ],
    isError: true,
  };
}

export class ClaudeController {
  static async listMeetings(
    claudeUserId: string,
    input: ListMeetingsInputType,
  ): Promise<CallToolResult> {
    const result = await FathomController.listMeetings(claudeUserId, {
      limit: input.limit,
      created_after: input.created_after,
      created_before: input.created_before,
    });

    return formatToolResult(
      result.success,
      result.success ? result.data : result.error,
    );
  }

  static async searchMeetings(
    claudeUserId: string,
    input: SearchMeetingsInputType,
  ): Promise<CallToolResult> {
    const result = await FathomController.listMeetings(claudeUserId, {
      limit: input.limit ?? 50,
    });

    if (!result.success) {
      return formatToolResult(false, result.error);
    }

    const query = input.query.toLowerCase();
    const filtered = result.data.items.filter(
      (meeting) =>
        meeting.title.toLowerCase().includes(query) ||
        meeting.meeting_title?.toLowerCase().includes(query),
    );

    return formatToolResult(true, {
      items: filtered.slice(0, input.limit ?? 10),
      total_matches: filtered.length,
    });
  }

  static async getTranscript(
    claudeUserId: string,
    input: GetTranscriptInputType,
  ): Promise<CallToolResult> {
    const result = await FathomController.getTranscript(
      claudeUserId,
      input.recording_id,
    );

    return formatToolResult(
      result.success,
      result.success ? result.data : result.error,
    );
  }

  static async getSummary(
    claudeUserId: string,
    input: GetSummaryInputType,
  ): Promise<CallToolResult> {
    const result = await FathomController.getSummary(
      claudeUserId,
      input.recording_id,
    );

    return formatToolResult(
      result.success,
      result.success ? result.data : result.error,
    );
  }

  static async getActionItems(
    claudeUserId: string,
    input: GetSummaryInputType,
  ): Promise<CallToolResult> {
    // Action items come with the meeting data
    const result = await FathomController.listMeetings(claudeUserId, {
      limit: 100,
    });

    if (!result.success) {
      return formatToolResult(false, result.error);
    }

    // Find the meeting with this recording ID and return its action items
    // Note: The Fathom API doesn't have a direct action items endpoint,
    // they're included in the meeting response when include_action_items is set
    return formatToolResult(true, {
      message:
        "Action items are included in meeting data. Use list_meetings or get specific meeting details.",
    });
  }

  static async listTeams(claudeUserId: string): Promise<CallToolResult> {
    const result = await FathomController.listTeams(claudeUserId);

    return formatToolResult(
      result.success,
      result.success ? result.data : result.error,
    );
  }

  static async listTeamMembers(
    claudeUserId: string,
    input: ListTeamMembersInputType,
  ): Promise<CallToolResult> {
    const result = await FathomController.listTeamMembers(
      claudeUserId,
      input.team_id,
    );

    return formatToolResult(
      result.success,
      result.success ? result.data : result.error,
    );
  }
}
