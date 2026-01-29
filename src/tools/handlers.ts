import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../middleware";
import { FathomService } from "../modules/fathom/service";
import {
  listMeetingsInputSchema,
  listTeamMembersInputSchema,
  recordingInputSchema,
  searchMeetingsInputSchema,
} from "../shared/schemas";

export async function listMeetings(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = listMeetingsInputSchema.parse(args);
    const service = await FathomService.createAuthorizedService(userId);
    const data = await service.listMeetings(input);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "list_meetings", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: (error as Error).message }],
      isError: true,
    };
  }
}

export async function getTranscript(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = recordingInputSchema.parse(args);
    const service = await FathomService.createAuthorizedService(userId);
    const data = await service.getTranscript(input.recording_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "get_transcript", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: (error as Error).message }],
      isError: true,
    };
  }
}

export async function getSummary(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = recordingInputSchema.parse(args);
    const service = await FathomService.createAuthorizedService(userId);
    const data = await service.getSummary(input.recording_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "get_summary", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: (error as Error).message }],
      isError: true,
    };
  }
}

export async function listTeams(userId: string): Promise<CallToolResult> {
  try {
    const service = await FathomService.createAuthorizedService(userId);
    const data = await service.listTeams();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "list_teams", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: (error as Error).message }],
      isError: true,
    };
  }
}

export async function listTeamMembers(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = listTeamMembersInputSchema.parse(args);
    const service = await FathomService.createAuthorizedService(userId);
    const data = await service.listTeamMembers(input.team_name);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "list_team_members", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: (error as Error).message }],
      isError: true,
    };
  }
}

export async function searchMeetings(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = searchMeetingsInputSchema.parse(args);
    const service = await FathomService.createAuthorizedService(userId);
    const meetings = await service.listMeetings({ limit: input.limit ?? 50 });

    const query = input.query.toLowerCase();
    const filtered = meetings.items.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.meeting_title?.toLowerCase().includes(query),
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { items: filtered.slice(0, input.limit ?? 10) },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error({ tool: "search_meetings", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: (error as Error).message }],
      isError: true,
    };
  }
}
