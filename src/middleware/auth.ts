import type { NextFunction, Request, Response } from "express";
import { getMcpServerAccessToken } from "../modules/oauth/service";
import { config } from "../shared/config";
import { BEARER_PREFIX } from "../shared/constants";
import { logger } from "./logger";

export interface AuthenticatedRequest extends Request {
  userId: string;
}
const WWW_AUTHENTICATE_VALUE = `Bearer resource_metadata="${config.baseUrl}/.well-known/oauth-protected-resource"`;

function sendUnauthorized(res: Response, code: string, message: string) {
  logger.error({ errorType: "auth", code, message }, "Authentication failed");
  res.setHeader("WWW-Authenticate", WWW_AUTHENTICATE_VALUE);
  res.status(401).json({ error: code, error_description: message });
}

export async function bearerAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    sendUnauthorized(
      res,
      "unauthorized",
      "Missing or invalid Authorization header",
    );
    return;
  }

  const token = authHeader.slice(BEARER_PREFIX.length);

  try {
    const accessTokenRecord = await getMcpServerAccessToken(token);

    if (!accessTokenRecord) {
      sendUnauthorized(res, "invalid_token", "Token not found or expired");
      return;
    }

    (req as AuthenticatedRequest).userId = accessTokenRecord.userId;
    next();
  } catch (error) {
    logger.error(
      { errorType: "server", error },
      "Auth middleware unexpected error",
    );
    res.status(500).json({
      error: "server_error",
      error_description: "An unexpected error occurred",
    });
  }
}
