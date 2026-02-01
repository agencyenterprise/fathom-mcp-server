import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { FathomAPIClient } from "../modules/fathom/api";
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
    return error.issues[0]?.message || "Invalid parameters";
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
    const data = await service.listMeetings(input);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
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
    const { recording_id } = recordingReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.getTranscript(recording_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
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
    const { recording_id } = recordingReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.getSummary(recording_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
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
    const { cursor } = listTeamsReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.listTeams(cursor);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
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
    const { team, cursor } = listTeamMembersReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.listTeamMembers(team, cursor);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
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
    // note for zod schema this seraches title and meeting title
    const input = searchMeetingsReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.listMeetings(input);

    const query = input.query.toLowerCase();
    const filtered = data.items.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.meeting_title?.toLowerCase().includes(query),
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ items: filtered }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: formatToolError(error) }],
      isError: true,
    };
  }
}
