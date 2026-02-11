import type { NextFunction, Request, Response } from "express";
import { getMcpServerAccessToken } from "../modules/oauth/service";
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

function getTokenHint(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith(BEARER_PREFIX)) return null;
  const token = authHeader.slice(BEARER_PREFIX.length);
  if (token.length < 12) return null;
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function sendUnauthorized(
  req: Request,
  res: Response,
  code: string,
  message: string,
) {
  logger.info(
    {
      errorType: "auth",
      code,
      message,
      ip: req.ip,
      forwardedFor: req.headers["x-forwarded-for"],
      socketIp: req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      method: req.method,
      path: req.path,
      tokenHint: getTokenHint(req.headers.authorization),
    },
    "Authentication failed",
  );
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
      req,
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
      sendUnauthorized(req, res, "invalid_token", "Token not found or expired");
      return;
    }

    req.userId = accessTokenRecord.userId;
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
