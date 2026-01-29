import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error({ err }, "Request error");

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      error_description: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "invalid_request",
      error_description: err.errors[0]?.message || "Invalid parameters",
    });
    return;
  }

  res.status(500).json({
    error: "server_error",
    error_description: err.message || "Internal server error",
  });
}

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
