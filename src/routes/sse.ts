import type { Request } from "express";
import { Router } from "express";
import type { SessionManager } from "../modules/sessions/manager";

function getSessionManager(req: Request): SessionManager {
  return req.app.locals.sessionManager;
}

export const sseConnectionRouter = Router();
export const sseMessageRouter = Router();

sseConnectionRouter.get("/", (req, res, next) => {
  const sessionManager = getSessionManager(req);
  sessionManager.createSseSession(req.userId!, res).catch(next);
});

sseMessageRouter.post("/", (req, res, next) => {
  const sessionManager = getSessionManager(req);
  const sessionId = req.query["sessionId"] as string | undefined;

  if (!sessionId) {
    res.status(400).json({
      error: "bad_request",
      error_description: "Missing sessionId query parameter",
    });
    return;
  }

  sessionManager.handleSseMessage(sessionId, req.userId!, req, res).catch(next);
});
