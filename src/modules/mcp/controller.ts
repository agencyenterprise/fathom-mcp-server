import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { Request, Response } from "express";
import { AppError } from "../../middleware/error";
import type { SessionManager } from "./sessions";

function getSessionManager(req: Request): SessionManager {
  return req.app.locals.sessionManager;
}

export async function routeToSessionOrInitialize(req: Request, res: Response) {
  const sessionManager = getSessionManager(req);
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId) {
    const session = await sessionManager.retrieveSession(sessionId);
    if (session) {
      await session.transport.handleRequest(req, res, req.body);
      return;
    }
  }

  if (!sessionId && isInitializeRequest(req.body)) {
    if (!req.userId) {
      throw new AppError(401, "unauthorized", "Unauthorized");
    }

    const transport = await sessionManager.createSession(req.userId);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  throw new AppError(400, "bad_request", "No valid session ID provided");
}

export async function retrieveAuthenticatedSession(
  req: Request,
  res: Response,
) {
  const sessionManager = getSessionManager(req);
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId) {
    throw new AppError(400, "bad_request", "Missing session ID");
  }

  const session = await sessionManager.retrieveSession(sessionId);
  if (!session) {
    throw new AppError(404, "not_found", "Session not found or expired");
  }

  if (session.userId !== req.userId) {
    throw new AppError(
      403,
      "forbidden",
      "Session does not belong to this user",
    );
  }

  await session.transport.handleRequest(req, res);
}

export async function terminateAuthenticatedSession(
  req: Request,
  res: Response,
) {
  const sessionManager = getSessionManager(req);
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId) {
    throw new AppError(400, "bad_request", "Missing session ID");
  }

  const session = await sessionManager.retrieveSession(sessionId);
  if (!session) {
    throw new AppError(404, "not_found", "Session not found or expired");
  }

  if (session.userId !== req.userId) {
    throw new AppError(
      403,
      "forbidden",
      "Session does not belong to this user",
    );
  }

  await sessionManager.terminateSession(sessionId);
  res.status(204).send();
}
