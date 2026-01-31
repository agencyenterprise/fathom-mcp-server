import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";
import {
  authError,
  forbiddenError,
  notFoundError,
  sessionError,
} from "../../shared/errors";
import type { SessionManager } from "./manager";

function getSessionManager(req: Request): SessionManager {
  return req.app.locals.sessionManager;
}

export async function routeToSessionOrInitialize(req: Request, res: Response) {
  const sessionManager = getSessionManager(req);
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId) {
    const session = await sessionManager.retrieveSession(sessionId);

    if (!session) {
      throw notFoundError("Session");
    }

    if (session.userId !== req.userId) {
      throw forbiddenError("Session does not belong to this user");
    }

    await session.transport.handleRequest(req, res, req.body);
    return;
  }

  if (isInitializeRequest(req.body)) {
    if (!req.userId) {
      throw authError("unauthorized", "Unauthorized");
    }

    const transport = await sessionManager.createSession(req.userId);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  throw sessionError(
    "bad_request",
    "Missing session ID for non-initialize request",
  );
}

export async function retrieveAuthenticatedSession(
  req: Request,
  res: Response,
) {
  const sessionManager = getSessionManager(req);
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId) {
    throw sessionError("bad_request", "Missing session ID");
  }

  const session = await sessionManager.retrieveSession(sessionId);
  if (!session) {
    throw notFoundError("Session");
  }

  if (session.userId !== req.userId) {
    throw forbiddenError("Session does not belong to this user");
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
    throw sessionError("bad_request", "Missing session ID");
  }

  const session = await sessionManager.retrieveSession(sessionId);
  if (!session) {
    throw notFoundError("Session");
  }

  if (session.userId !== req.userId) {
    throw forbiddenError("Session does not belong to this user");
  }

  await sessionManager.terminateSession(sessionId);
  res.status(204).send();
}
