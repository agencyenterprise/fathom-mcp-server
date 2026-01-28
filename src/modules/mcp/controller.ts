import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { McpService } from "./service";

export class McpController {
  static async handlePost(req: AuthenticatedRequest, res: Response) {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId) {
        const session = McpService.getTransport(sessionId);
        if (session) {
          await session.transport.handleRequest(req, res, req.body);
          return;
        }
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        const userId = req.userId;
        if (!userId) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        const transport = McpService.createTransport(userId);
        await McpService.connectTransport(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      res
        .status(400)
        .json({ error: "Bad Request: No valid session ID provided" });
    } catch (error) {
      console.error("MCP POST error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }

  static async handleGet(req: Request, res: Response) {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (!sessionId) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }

      const session = McpService.getTransport(sessionId);
      if (!session) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }

      await session.transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP GET error:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  }

  static async handleDelete(req: Request, res: Response) {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (!sessionId) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }

      const session = McpService.getTransport(sessionId);
      if (!session) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }

      await session.transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP DELETE error:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  }
}
