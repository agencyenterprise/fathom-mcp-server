import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "../shared/config";
import { sessionError } from "../shared/errors";
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

export class ToolServer {
  private server: McpServer;
  private getActiveTransportFn: (
    sessionId: string,
  ) => { userId: string } | undefined;

  constructor(
    getActiveTransportFn: (sessionId: string) => { userId: string } | undefined,
  ) {
    this.getActiveTransportFn = getActiveTransportFn;
    this.server = new McpServer(
      { name: "fathom-mcp", version: config.version },
      { capabilities: { logging: {}, tools: { listChanged: false } } },
    );

    this.registerTools();
  }

  private registerTools() {
    this.server.registerTool(
      "list_meetings",
      {
        title: "List Meetings",
        description:
          "List Fathom meetings with optional filters: limit (1-100), cursor (pagination), " +
          "created_after, created_before (ISO timestamps), calendar_invitees_domains (company domains), " +
          "calendar_invitees_domains_type (all/only_internal/one_or_more_external), " +
          "teams (team names), recorded_by (recorder emails), include_action_items (boolean)",
        inputSchema: listMeetingsReqSchema.shape,
      },
      async (args, extra) => {
        const userId = this.getUserId(extra);
        return listMeetings(userId, args);
      },
    );

    this.server.registerTool(
      "search_meetings",
      {
        title: "Search Meetings",
        description:
          "Search Fathom meetings by title. Required: query (search term). " +
          "Optional filters: limit (1-100), created_after, created_before (ISO timestamps), " +
          "calendar_invitees_domains, calendar_invitees_domains_type, teams, recorded_by",
        inputSchema: searchMeetingsReqSchema.shape,
      },
      async (args, extra) => {
        const userId = this.getUserId(extra);
        return searchMeetings(userId, args);
      },
    );

    this.server.registerTool(
      "get_transcript",
      {
        title: "Get Transcript",
        description: "Get the full transcript for a specific meeting recording",
        inputSchema: recordingReqSchema.shape,
      },
      async (args, extra) => {
        const userId = this.getUserId(extra);
        return getTranscript(userId, args);
      },
    );

    this.server.registerTool(
      "get_summary",
      {
        title: "Get Summary",
        description: "Get the AI-generated summary for a meeting recording",
        inputSchema: recordingReqSchema.shape,
      },
      async (args, extra) => {
        const userId = this.getUserId(extra);
        return getSummary(userId, args);
      },
    );

    this.server.registerTool(
      "list_teams",
      {
        title: "List Teams",
        description:
          "List all Fathom teams you have access to. Optional: cursor for pagination.",
        inputSchema: listTeamsReqSchema.shape,
      },
      async (args, extra) => {
        const userId = this.getUserId(extra);
        return listTeams(userId, args);
      },
    );

    this.server.registerTool(
      "list_team_members",
      {
        title: "List Team Members",
        description:
          "List members of a Fathom team. Optional: team_name to filter by team, cursor for pagination.",
        inputSchema: listTeamMembersReqSchema.shape,
      },
      async (args, extra) => {
        const userId = this.getUserId(extra);
        return listTeamMembers(userId, args);
      },
    );
  }

  private getUserId(extra: ToolRequestExtra): string {
    if (!extra.sessionId) {
      throw sessionError("missing_session", "No session ID provided in tool context");
    }

    const session = this.getActiveTransportFn(extra.sessionId);
    if (!session) {
      throw sessionError("session_not_found", "Session not found");
    }

    return session.userId;
  }

  getServer(): McpServer {
    return this.server;
  }

  async close() {
    await this.server.close();
  }
}
