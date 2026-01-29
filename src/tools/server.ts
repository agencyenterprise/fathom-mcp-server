import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "../shared/config";
import {
  listMeetingsInputSchema,
  listTeamMembersInputSchema,
  recordingInputSchema,
  searchMeetingsInputSchema,
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
          "List your recent Fathom meetings with optional date filters",
        inputSchema: listMeetingsInputSchema.shape,
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
        description: "Search your Fathom meetings by title",
        inputSchema: searchMeetingsInputSchema.shape,
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
        inputSchema: recordingInputSchema.shape,
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
        inputSchema: recordingInputSchema.shape,
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
        description: "List all Fathom teams you have access to",
        inputSchema: {},
      },
      async (_args, extra) => {
        const userId = this.getUserId(extra);
        return listTeams(userId);
      },
    );

    this.server.registerTool(
      "list_team_members",
      {
        title: "List Team Members",
        description: "List members of a specific Fathom team",
        inputSchema: listTeamMembersInputSchema.shape,
      },
      async (args, extra) => {
        const userId = this.getUserId(extra);
        return listTeamMembers(userId, args);
      },
    );
  }

  private getUserId(extra: ToolRequestExtra): string {
    if (!extra.sessionId) {
      throw new Error("No session ID provided in tool context");
    }

    const session = this.getActiveTransportFn(extra.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${extra.sessionId}`);
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
