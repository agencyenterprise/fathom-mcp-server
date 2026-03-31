import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "../shared/config";
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
import {
  getActionItems,
  getMeetingContext,
  getSummary,
  getTranscript,
  getWeeklyRecap,
  listMeetings,
  listTeamMembers,
  listTeams,
  searchMeetings,
} from "./handlers";

type ToolRequestExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

type GetActiveTransportFn = (
  sessionId: string,
) => { userId: string } | undefined;

function getUserId(
  getActiveTransportFn: GetActiveTransportFn,
  extra: ToolRequestExtra,
): string {
  if (!extra.sessionId) {
    throw AppError.session(
      "missing_session",
      "No session ID provided in tool context",
    );
  }

  const session = getActiveTransportFn(extra.sessionId);
  if (!session) {
    throw AppError.session("session_not_found", "Session not found");
  }

  return session.userId;
}

export function createToolServer(
  getActiveTransportFn: GetActiveTransportFn,
): McpServer {
  const server = new McpServer(
    { name: "fathom-mcp", version: config.version },
    {
      capabilities: {
        logging: {},
        tools: { listChanged: false },
        prompts: { listChanged: false },
      },
    },
  );

  server.registerTool(
    "list_meetings",
    {
      title: "List Meetings",
      description:
        "List Fathom meetings with optional filters: cursor (pagination; pass the next_cursor from the previous response to get the next page), " +
        "created_after, created_before (ISO timestamps), calendar_invitees_domains (company domains), " +
        "calendar_invitees_domains_type (all/only_internal/one_or_more_external), " +
        "limit (max number of meetings to return), " +
        "teams (team names), recorded_by (recorder emails), include_action_items (boolean), include_crm_matches (boolean). " +
        "Response includes next_cursor: when non-null, call again with cursor set to that value to fetch more meetings.",
      inputSchema: listMeetingsReqSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const userId = getUserId(getActiveTransportFn, extra);
      return listMeetings(userId, args);
    },
  );

  server.registerTool(
    "search_meetings",
    {
      title: "Search Meetings",
      description:
        "Search Fathom meetings by title, meeting title, host name, host email, or attendee name/email. " +
        "Automatically scans up to 5 pages of results by default. Required: query (search term). " +
        "Optional filters: cursor, created_after, created_before (ISO timestamps), calendar_invitees_domains, " +
        "calendar_invitees_domains_type, teams, recorded_by, include_action_items (boolean), " +
        "include_crm_matches (boolean), max_pages (override the 5 page default). " +
        "Response includes next_cursor (non-null means more pages exist) and total_searched (meetings scanned).",
      inputSchema: searchMeetingsReqSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const userId = getUserId(getActiveTransportFn, extra);
      return searchMeetings(userId, args);
    },
  );

  server.registerTool(
    "get_transcript",
    {
      title: "Get Transcript",
      description:
        "Get the transcript for a specific meeting recording. " +
        "Optional: speaker (filter entries to only a specific speaker name).",
      inputSchema: getTranscriptReqSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const userId = getUserId(getActiveTransportFn, extra);
      return getTranscript(userId, args);
    },
  );

  server.registerTool(
    "get_summary",
    {
      title: "Get Summary",
      description: "Get the AI-generated summary for a meeting recording",
      inputSchema: recordingReqSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const userId = getUserId(getActiveTransportFn, extra);
      return getSummary(userId, args);
    },
  );

  server.registerTool(
    "list_teams",
    {
      title: "List Teams",
      description:
        "List all Fathom teams you have access to. Optional: cursor for pagination.",
      inputSchema: listTeamsReqSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const userId = getUserId(getActiveTransportFn, extra);
      return listTeams(userId, args);
    },
  );

  server.registerTool(
    "list_team_members",
    {
      title: "List Team Members",
      description:
        "List members of a Fathom team. Optional: team to filter by team name, cursor for pagination.",
      inputSchema: listTeamMembersReqSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const userId = getUserId(getActiveTransportFn, extra);
      return listTeamMembers(userId, args);
    },
  );

  server.registerTool(
    "get_action_items",
    {
      title: "Get Action Items",
      description:
        "Aggregate action items across meetings. Optional: created_after, created_before (ISO timestamps), " +
        "completed (true for completed only, false for outstanding only).",
      inputSchema: getActionItemsReqSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const userId = getUserId(getActiveTransportFn, extra);
      return getActionItems(userId, args);
    },
  );

  server.registerTool(
    "get_meeting_context",
    {
      title: "Get Meeting Context",
      description:
        "Find past meetings involving a specific person or topic and return their summaries. " +
        "Useful for meeting prep. Required: query (attendee name, email, or topic). " +
        "Optional: created_after, created_before (ISO timestamps).",
      inputSchema: getMeetingContextReqSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const userId = getUserId(getActiveTransportFn, extra);
      return getMeetingContext(userId, args);
    },
  );

  server.registerTool(
    "get_weekly_recap",
    {
      title: "Get Weekly Recap",
      description:
        "Get a digest of meetings and their summaries from the past N days. " +
        "Optional: days (number of days to look back, default 7).",
      inputSchema: getWeeklyRecapReqSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const userId = getUserId(getActiveTransportFn, extra);
      return getWeeklyRecap(userId, args);
    },
  );

  server.registerPrompt(
    "latest_meeting_short_summary",
    {
      title: "Summarize Latest Meeting",
      description:
        "Get a short summary of the transcript from your most recent Fathom meeting",
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Call list_meetings with limit 1 to get my most recent meeting.

                  Then call get_transcript using the recording_id from that result.

                  Present your response in this format:

                  **[meeting title] — [date]**
                  Attendees: [names]

                  **Short Summary**
                  ...`,
          },
        },
      ],
    }),
  );

  return server;
}
