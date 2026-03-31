import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { FathomAPIClient } from "../modules/fathom/api";
import type { ListMeetingsResType } from "../modules/fathom/schema";
import { MAX_SEARCH_PAGES } from "../shared/constants";
import { AppError } from "../shared/errors";
import {
  getActionItemsReqSchema,
  getMeetingContextReqSchema,
  getTranscriptReqSchema,
  getWeeklyRecapReqSchema,
  listMeetingsReqSchema,
  listTeamMembersReqSchema,
  listTeamsReqSchema,
  recordingReqSchema,
  searchMeetingsReqSchema,
} from "../shared/schemas";

function formatToolError(error: unknown): string {
  if (error instanceof AppError) {
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
    const { recording_id, speaker } = getTranscriptReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.getTranscript(recording_id);

    const transcript = speaker
      ? data.transcript.filter((entry) =>
          entry.speaker.display_name
            .toLowerCase()
            .includes(speaker.toLowerCase()),
        )
      : data.transcript;

    return {
      content: [
        { type: "text", text: JSON.stringify({ transcript }, null, 2) },
      ],
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
    const pageLimit = input.max_pages ?? MAX_SEARCH_PAGES;

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
    } while (cursor && pagesSearched < pageLimit);

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

export async function getActionItems(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = getActionItemsReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.listMeetings({
      created_after: input.created_after,
      created_before: input.created_before,
      include_action_items: true,
    });

    const actionItems = data.items.flatMap((meeting) =>
      (meeting.action_items ?? [])
        .filter(
          (item) =>
            input.completed === undefined || item.completed === input.completed,
        )
        .map((item) => ({
          description: item.description,
          completed: item.completed,
          assignee: item.assignee,
          meeting_title: meeting.title,
          meeting_date: meeting.created_at,
          recording_id: meeting.recording_id,
        })),
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ action_items: actionItems }, null, 2),
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

export async function getMeetingContext(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = getMeetingContextReqSchema.parse(args);
    const service = await FathomAPIClient.createAuthorizedService(userId);
    const query = input.query.toLowerCase();

    let cursor: string | undefined = undefined;
    let pagesSearched = 0;
    const matched: Meeting[] = [];

    do {
      const data = await service.listMeetings({
        created_after: input.created_after,
        created_before: input.created_before,
        cursor,
      });
      pagesSearched++;

      matched.push(...data.items.filter((m) => meetingMatchesQuery(m, query)));
      cursor = data.next_cursor ?? undefined;
    } while (cursor && pagesSearched < MAX_SEARCH_PAGES);

    const meetings = matched.map((meeting) => ({
      title: meeting.title,
      recording_id: meeting.recording_id,
      date: meeting.created_at,
      attendees: meeting.calendar_invitees.map((i) => i.name).filter(Boolean),
      summary: meeting.default_summary?.markdown_formatted ?? null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ meetings }, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: formatToolError(error) }],
      isError: true,
    };
  }
}

export async function getWeeklyRecap(
  userId: string,
  args: unknown,
): Promise<CallToolResult> {
  try {
    const input = getWeeklyRecapReqSchema.parse(args);
    const days = input.days ?? 7;
    const created_after = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const service = await FathomAPIClient.createAuthorizedService(userId);
    const data = await service.listMeetings({ created_after });

    const meetings = data.items.map((meeting) => ({
      title: meeting.title,
      recording_id: meeting.recording_id,
      date: meeting.created_at,
      attendees: meeting.calendar_invitees.map((i) => i.name).filter(Boolean),
      summary: meeting.default_summary?.markdown_formatted ?? null,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { meetings, total_meetings: meetings.length },
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
