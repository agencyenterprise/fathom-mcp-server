import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { logger } from "../middleware/logger";
import { FathomAPIClient } from "../modules/fathom/service";
import { DEFAULT_MEETINGS_LIMIT, SEARCH_POOL_SIZE } from "../shared/constants";
import { ErrorLogger } from "../shared/errors";
import {
  listMeetingsReqSchema,
  listTeamMembersReqSchema,
  listTeamsReqSchema,
  recordingReqSchema,
  searchMeetingsReqSchema,
} from "../shared/schemas";

function formatToolError(error: unknown): string {
  if (error instanceof ErrorLogger) {
    return error.message;
  }
  if (error instanceof ZodError) {
    return error.errors[0]?.message || "Invalid parameters";
  }
  return "An unexpected error occurred";
}

export async function listMeetings(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = listMeetingsReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.listMeetings({
      ...input,
      limit: input.limit ?? DEFAULT_MEETINGS_LIMIT,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "list_meetings", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: formatToolError(error) }],
      isError: true,
    };
  }
}

export async function getTranscript(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = recordingReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.getTranscript(input.recording_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "get_transcript", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: formatToolError(error) }],
      isError: true,
    };
  }
}

export async function getSummary(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = recordingReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.getSummary(input.recording_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "get_summary", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: formatToolError(error) }],
      isError: true,
    };
  }
}

export async function listTeams(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = listTeamsReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.listTeams(input.cursor);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "list_teams", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: formatToolError(error) }],
      isError: true,
    };
  }
}

export async function listTeamMembers(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = listTeamMembersReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.listTeamMembers(input.team_name, input.cursor);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error({ tool: "list_team_members", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: formatToolError(error) }],
      isError: true,
    };
  }
}

export async function searchMeetings(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = searchMeetingsReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);

    const meetings = await service.listMeetings({
      ...input,
      limit: SEARCH_POOL_SIZE,
    });

    const query = input.query.toLowerCase();
    const filtered = meetings.items.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.meeting_title?.toLowerCase().includes(query),
    );

    const resultsLimit = input.limit ?? DEFAULT_MEETINGS_LIMIT;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { items: filtered.slice(0, resultsLimit) },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error({ tool: "search_meetings", error, userId }, "Tool error");
    return {
      content: [{ type: "text", text: formatToolError(error) }],
      isError: true,
    };
  }
}
