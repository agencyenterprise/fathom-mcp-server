import type { NextFunction, Request, Response } from "express";
import { OAuthService } from "../modules/oauth/service";
import { config } from "../shared/config";
import { BEARER_PREFIX } from "../shared/constants";
import { logger } from "./logger";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const WWW_AUTHENTICATE_VALUE = `Bearer resource_metadata="${config.baseUrl}/.well-known/oauth-protected-resource"`;

function sendUnauthorized(res: Response, error: string, description: string) {
  res.setHeader("WWW-Authenticate", WWW_AUTHENTICATE_VALUE);
  res.status(401).json({ error, error_description: description });
}

export async function bearerAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    logger.debug("Missing bearer token");
    sendUnauthorized(
      res,
      "unauthorized",
      "Missing or invalid Authorization header",
    );
    return;
  }

  const token = authHeader.slice(BEARER_PREFIX.length);

  try {
    const tokenRecord = await OAuthService.getAccessToken(token);

    if (!tokenRecord) {
      sendUnauthorized(res, "invalid_token", "Token not found or expired");
      return;
    }

    req.userId = tokenRecord.userId;
    next();
  } catch (error) {
    logger.error({ error }, "Auth middleware error");
    res.status(500).json({
      error: "server_error",
      error_description: "Failed to validate token",
    });
  }
}
