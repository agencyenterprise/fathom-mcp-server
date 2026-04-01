import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";
import { AppError } from "../../shared/errors";
import type { SessionManager } from "./manager";
import { sessionsReqSchema } from "./schema";

function getSessionManager(req: Request): SessionManager {
  return req.app.locals.sessionManager;
}

export async function routeToSessionOrInitialize(req: Request, res: Response) {
  const sessionManager = getSessionManager(req);
  const { sessionId, userId } = sessionsReqSchema.parse({
    sessionId: req.headers["mcp-session-id"],
    userId: req.userId,
  });

  if (sessionId) {
    const session = await sessionManager.retrieveSession(sessionId);

    if (!session) {
      throw AppError.notFound("Session");
    }

    if (session.userId !== userId) {
      throw AppError.forbidden("Session does not belong to this user");
    }

    await session.transport.handleRequest(req, res, req.body);
    return;
  }

  if (isInitializeRequest(req.body)) {
    if (!userId) {
      throw AppError.auth("unauthorized", "Unauthorized");
    }

    const transport = await sessionManager.createSession(userId);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  throw AppError.session(
    "bad_request",
    "Missing session ID for non-initialize request",
  );
}

export async function retrieveAuthenticatedSession(
  req: Request,
  res: Response,
) {
  const sessionManager = getSessionManager(req);
  const { sessionId, userId } = sessionsReqSchema.parse({
    userId: req.userId,
    sessionId: req.headers["mcp-session-id"],
  });

  if (!sessionId) {
    throw AppError.session("bad_request", "Missing session ID");
  }

  const session = await sessionManager.retrieveSession(sessionId);
  if (!session) {
    throw AppError.notFound("Session");
  }

  if (session.userId !== userId) {
    throw AppError.forbidden("Session does not belong to this user");
  }

  await session.transport.handleRequest(req, res);
}

export async function terminateAuthenticatedSession(
  req: Request,
  res: Response,
) {
  const sessionManager = getSessionManager(req);
  const { userId, sessionId } = sessionsReqSchema.parse({
    userId: req.userId,
    sessionId: req.headers["mcp-session-id"],
  });

  if (!sessionId) {
    throw AppError.session("bad_request", "Missing session ID");
  }

  const session = await sessionManager.retrieveSession(sessionId);
  if (!session) {
    throw AppError.notFound("Session");
  }

  if (session.userId !== userId) {
    throw AppError.forbidden("Session does not belong to this user");
  }

  await sessionManager.terminateSession(sessionId);
  res.status(204).send();
}
