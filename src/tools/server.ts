import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../common/config";
import {
  listMeetingsInputSchema,
  listTeamMembersInputSchema,
  recordingInputSchema,
  searchMeetingsInputSchema,
} from "../common/schemas";
import { McpService } from "../modules/mcp/service";
import { ToolHandlers } from "./handlers";

export class ToolServer {
  private server: McpServer;

  constructor() {
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
        return ToolHandlers.listMeetings(userId, args);
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
        return ToolHandlers.searchMeetings(userId, args);
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
        return ToolHandlers.getTranscript(userId, args);
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
        return ToolHandlers.getSummary(userId, args);
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
        return ToolHandlers.listTeams(userId);
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
        return ToolHandlers.listTeamMembers(userId, args);
      },
    );
  }

  private getUserId(extra: unknown): string {
    const extraObj = extra as { sessionId?: string };

    if (!extraObj?.sessionId) {
      throw new Error("No session ID provided in tool context");
    }

    const session = McpService.getTransport(extraObj.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${extraObj.sessionId}`);
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
