import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { logger } from "../middleware/logger";
import { FathomAPIClient } from "../modules/fathom/api";
import type { ListMeetingsResType } from "../modules/fathom/schema";
import { MAX_SEARCH_PAGES } from "../shared/constants";
import { AppError } from "../shared/errors";
import {
  listMeetingsReqSchema,
  listTeamMembersReqSchema,
  listTeamsReqSchema,
  recordingReqSchema,
  searchMeetingsReqSchema,
} from "../shared/schemas";

function formatToolError(error: unknown): string {
  if (error instanceof AppError) {
    logger.warn(
      { errorType: error.errorType, code: error.code },
      error.message,
    );
    return error.message;
  }
  if (error instanceof ZodError) {
    logger.warn(
      { errorType: "validation", errors: error.issues },
      "Tool validation error",
    );
    return error.issues[0]?.message || "Invalid parameters";
  }
  logger.error({ error }, "Unexpected tool error");
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

type Meeting = ListMeetingsResType["items"][number];

function meetingMatchesQuery(meeting: Meeting, query: string): boolean {
  return (
    meeting.title.toLowerCase().includes(query) ||
    meeting.meeting_title?.toLowerCase().includes(query) ||
    meeting.recorded_by.name.toLowerCase().includes(query) ||
    meeting.recorded_by.email.toLowerCase().includes(query) ||
    meeting.calendar_invitees.some(
      (invitee) =>
        invitee.name?.toLowerCase().includes(query) ||
        invitee.email?.toLowerCase().includes(query),
    )
  );
}

export async function searchMeetings(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = searchMeetingsReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const query = input.query.toLowerCase();

    let cursor: string | undefined = input.cursor;
    let totalSearched = 0;
    let pagesSearched = 0;
    const matchedMeetings: Meeting[] = [];

    do {
      const data = await service.listMeetings({ ...input, cursor });
      totalSearched += data.items.length;
      pagesSearched++;

      const matches = data.items.filter((m) => meetingMatchesQuery(m, query));
      matchedMeetings.push(...matches);

      cursor = data.next_cursor ?? undefined;
    } while (cursor && pagesSearched < MAX_SEARCH_PAGES);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              items: matchedMeetings,
              next_cursor: cursor ?? null,
              total_searched: totalSearched,
            },
            null,
            2,
          ),
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
