import { NextFunction, Request, Response } from "express";
import { OAuthService } from "../modules/oauth";
import { AppError } from "./error";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function bearerAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new AppError(
        401,
        "unauthorized",
        "Missing or invalid Authorization header",
      ),
    );
  }

  const token = authHeader.slice(7);

  const tokenRecord = await OAuthService.getAccessToken(token);

  if (!tokenRecord) {
    return next(
      new AppError(401, "invalid_token", "Token not found or expired"),
    );
  }

  req.userId = tokenRecord.userId;
  next();
}
