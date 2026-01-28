import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ClaudeController } from "./controller";
import {
  getSummaryInputSchema,
  getTranscriptInputSchema,
  listMeetingsInputSchema,
  listTeamMembersInputSchema,
  searchMeetingsInputSchema,
} from "./schema";

interface SessionTransport {
  transport: StreamableHTTPServerTransport;
  userId: string;
}

export class ClaudeService {
  private server: McpServer;
  private transports: Map<string, SessionTransport> = new Map();

  constructor() {
    this.server = new McpServer(
      {
        name: "fathom-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          logging: {},
          tools: {
            listChanged: false,
          },
        },
      },
    );

    this.registerTools();
  }

  private registerTools() {
    this.server.tool(
      "list_meetings",
      "List your recent Fathom meetings with optional date filters",
      listMeetingsInputSchema.shape,
      async (args, extra) => {
        const userId = this.getUserIdFromExtra(extra);
        return ClaudeController.listMeetings(userId, args);
      },
    );

    this.server.tool(
      "search_meetings",
      "Search your Fathom meetings by title",
      searchMeetingsInputSchema.shape,
      async (args, extra) => {
        const userId = this.getUserIdFromExtra(extra);
        return ClaudeController.searchMeetings(userId, args);
      },
    );

    this.server.tool(
      "get_transcript",
      "Get the full transcript for a specific meeting recording",
      getTranscriptInputSchema.shape,
      async (args, extra) => {
        const userId = this.getUserIdFromExtra(extra);
        return ClaudeController.getTranscript(userId, args);
      },
    );

    this.server.tool(
      "get_summary",
      "Get the AI-generated summary for a meeting recording",
      getSummaryInputSchema.shape,
      async (args, extra) => {
        const userId = this.getUserIdFromExtra(extra);
        return ClaudeController.getSummary(userId, args);
      },
    );

    this.server.tool(
      "list_teams",
      "List all Fathom teams you have access to",
      {},
      async (_args, extra) => {
        const userId = this.getUserIdFromExtra(extra);
        return ClaudeController.listTeams(userId);
      },
    );

    this.server.tool(
      "list_team_members",
      "List members of a specific Fathom team",
      listTeamMembersInputSchema.shape,
      async (args, extra) => {
        const userId = this.getUserIdFromExtra(extra);
        return ClaudeController.listTeamMembers(userId, args);
      },
    );
  }

  private getUserIdFromExtra(extra: unknown): string {
    // The user ID is stored when the session is initialized
    // For now, we'll use a placeholder - this will be set up properly with OAuth
    const extraObj = extra as { sessionId?: string };
    const sessionId = extraObj?.sessionId;

    if (sessionId) {
      const session = this.transports.get(sessionId);
      if (session) {
        return session.userId;
      }
    }

    // Fallback - should not happen in production
    return "unknown";
  }

  getRouter(): express.Router {
    const router = express.Router();

    router.post("/", async (req: Request, res: Response) => {
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (sessionId && this.transports.has(sessionId)) {
          const session = this.transports.get(sessionId)!;
          await session.transport.handleRequest(req, res, req.body);
          return;
        }

        if (!sessionId && isInitializeRequest(req.body)) {
          // TODO: Get user ID from OAuth/auth middleware
          const userId =
            (req as Request & { userId?: string }).userId || "test-user";

          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: true,
            onsessioninitialized: (newSessionId) => {
              this.transports.set(newSessionId, { transport, userId });
              console.log(`MCP session initialized: ${newSessionId}`);
            },
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && this.transports.has(sid)) {
              this.transports.delete(sid);
              console.log(`MCP session closed: ${sid}`);
            }
          };

          await this.server.connect(transport);
          await transport.handleRequest(req, res, req.body);
          return;
        }

        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
      } catch (error) {
        console.error("Error handling MCP POST request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
          });
        }
      }
    });

    router.get("/", async (req: Request, res: Response) => {
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (!sessionId || !this.transports.has(sessionId)) {
          res.status(400).send("Invalid or missing session ID");
          return;
        }

        const session = this.transports.get(sessionId)!;
        await session.transport.handleRequest(req, res);
      } catch (error) {
        console.error("Error handling MCP GET request:", error);
        if (!res.headersSent) {
          res.status(500).send("Internal server error");
        }
      }
    });

    router.delete("/", async (req: Request, res: Response) => {
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (!sessionId || !this.transports.has(sessionId)) {
          res.status(400).send("Invalid or missing session ID");
          return;
        }

        const session = this.transports.get(sessionId)!;
        await session.transport.handleRequest(req, res);
      } catch (error) {
        console.error("Error handling MCP DELETE request:", error);
        if (!res.headersSent) {
          res.status(500).send("Error processing session termination");
        }
      }
    });

    return router;
  }

  async close() {
    for (const [sessionId, session] of this.transports) {
      try {
        await session.transport.close();
        this.transports.delete(sessionId);
      } catch (error) {
        console.error(
          `Error closing transport for session ${sessionId}:`,
          error,
        );
      }
    }
    await this.server.close();
  }
}
