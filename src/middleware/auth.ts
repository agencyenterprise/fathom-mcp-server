import { NextFunction, Request, Response } from "express";
import { config } from "../common/config";
import { OAuthService } from "../modules/oauth";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function bearerAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.setHeader(
      "WWW-Authenticate",
      `Bearer resource_metadata="${config.baseUrl}/.well-known/oauth-protected-resource"`,
    );
    res.status(401).json({
      error: "unauthorized",
      error_description: "Missing or invalid Authorization header",
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const tokenRecord = await OAuthService.getAccessToken(token);

    if (!tokenRecord) {
      res.setHeader(
        "WWW-Authenticate",
        `Bearer resource_metadata="${config.baseUrl}/.well-known/oauth-protected-resource"`,
      );
      res.status(401).json({
        error: "invalid_token",
        error_description: "Token not found or expired",
      });
      return;
    }

    req.userId = tokenRecord.userId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Failed to validate token",
    });
  }
}
