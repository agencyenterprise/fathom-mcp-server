import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "../shared/config";
import { AppError } from "../shared/errors";
import {
  listMeetingsReqSchema,
  listTeamMembersReqSchema,
  listTeamsReqSchema,
  recordingReqSchema,
  searchMeetingsReqSchema,
} from "../shared/schemas";
import {
  getSummary,
  getTranscript,
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
    { capabilities: { logging: {}, tools: { listChanged: false } } },
  );

  server.registerTool(
    "list_meetings",
    {
      title: "List Meetings",
      description:
        "List Fathom meetings with optional filters: cursor (pagination; pass the next_cursor from the previous response to get the next page), " +
        "created_after, created_before (ISO timestamps), calendar_invitees_domains (company domains), " +
        "calendar_invitees_domains_type (all/only_internal/one_or_more_external), " +
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
        "Search Fathom meetings by title or meeting_title. Required: query (search term). " +
        "Optional filters: cursor (pagination; pass next_cursor from the previous response to get the next page), " +
        "created_after, created_before (ISO timestamps), calendar_invitees_domains, calendar_invitees_domains_type, " +
        "teams, recorded_by, include_action_items (boolean), include_crm_matches (boolean). " +
        "Response includes next_cursor: when non-null, call again with cursor set to that value to search more meetings.",
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
      description: "Get the full transcript for a specific meeting recording",
      inputSchema: recordingReqSchema.shape,
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

  return server;
}
