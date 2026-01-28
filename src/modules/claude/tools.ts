import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FathomController } from "../fathom";
import { McpService } from "../mcp/service";
import {
  listMeetingsInputSchema,
  listTeamMembersInputSchema,
  recordingInputSchema,
  searchMeetingsInputSchema,
} from "./schema";

export class ClaudeTools {
  private server: McpServer;

  constructor() {
    this.server = new McpServer(
      { name: "fathom-mcp", version: "1.0.0" },
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
        console.log("list_meetings called with userId:", userId);
        return FathomController.listMeetings(userId, args);
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
        console.log("search_meetings called with userId:", userId);
        return FathomController.searchMeetings(userId, args);
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
        console.log("get_transcript called with userId:", userId);
        return FathomController.getTranscript(userId, args);
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
        console.log("get_summary called with userId:", userId);
        return FathomController.getSummary(userId, args);
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
        console.log("list_teams called with userId:", userId);
        return FathomController.listTeams(userId);
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
        console.log("list_team_members called with userId:", userId);
        return FathomController.listTeamMembers(userId, args);
      },
    );
  }

  private getUserId(extra: unknown): string {
    const extraObj = extra as { sessionId?: string };
    console.log("getUserId extra:", JSON.stringify(extra, null, 2));

    if (extraObj?.sessionId) {
      const session = McpService.getTransport(extraObj.sessionId);
      if (session) {
        console.log("Found userId from session:", session.userId);
        return session.userId;
      }
    }

    console.log("No userId found, returning unknown");
    return "unknown";
  }

  getServer(): McpServer {
    return this.server;
  }

  async close() {
    await this.server.close();
  }
}
