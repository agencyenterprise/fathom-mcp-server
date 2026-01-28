import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { McpService } from "./service";

export class McpController {
  static async handlePost(req: AuthenticatedRequest, res: Response) {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId) {
      const session = McpService.getTransport(sessionId);
      if (session) {
        await session.transport.handleRequest(req, res, req.body);
        return;
      }
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      if (!req.userId) {
        throw new AppError(401, "unauthorized", "Unauthorized");
      }

      const transport = McpService.createTransport(req.userId);
      await McpService.connectTransport(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    throw new AppError(400, "bad_request", "No valid session ID provided");
  }

  static async handleGet(req: Request, res: Response) {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId) {
      throw new AppError(400, "bad_request", "Invalid or missing session ID");
    }

    const session = McpService.getTransport(sessionId);
    if (!session) {
      throw new AppError(400, "bad_request", "Invalid or missing session ID");
    }

    await session.transport.handleRequest(req, res);
  }

  static async handleDelete(req: Request, res: Response) {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId) {
      throw new AppError(400, "bad_request", "Invalid or missing session ID");
    }

    const session = McpService.getTransport(sessionId);
    if (!session) {
      throw new AppError(400, "bad_request", "Invalid or missing session ID");
    }

    await session.transport.handleRequest(req, res);
  }
}
