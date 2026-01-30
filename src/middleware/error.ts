import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ErrorLogger } from "../shared/errors";
import { logger } from "./logger";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ErrorLogger) {
    logger.error(
      {
        errorType: err.errorType,
        errorName: err.errorName,
        code: err.code,
        message: err.message,
        stack: err.stack,
      },
      "Request error",
    );

    res.status(err.statusCode).json({
      error: err.code,
      error_description: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    logger.error(
      { errorType: "validation", errors: err.errors },
      "Validation error",
    );

    res.status(400).json({
      error: "invalid_request",
      error_description: err.errors[0]?.message || "Invalid parameters",
    });
    return;
  }

  logger.error(
    { errorType: "unexpected", message: err.message, stack: err.stack },
    "Unexpected error",
  );

  res.status(500).json({
    error: "server_error",
    error_description: "An unexpected error occurred",
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
