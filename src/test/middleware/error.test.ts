import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorHandler } from "../../middleware/error";
import { AppError } from "../../shared/errors";

function createMockRequest(): Request {
  return {} as unknown as Request;
}

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

const next: NextFunction = vi.fn();

describe("middleware/error", () => {
  describe("errorHandler", () => {
    it("handles AppError with correct status and response", () => {
      const error = AppError.auth("unauthorized", "Invalid token");
      const req = createMockRequest();
      const res = createMockResponse();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "unauthorized",
        error_description: "Invalid token",
      });
    });

    it("handles different AppError types", () => {
      const testCases = [
        {
          error: AppError.oauth("invalid_grant", "Grant expired"),
          status: 400,
        },
        { error: AppError.validation("Invalid input"), status: 400 },
        { error: AppError.notFound("Session"), status: 404 },
        { error: AppError.server("Internal error"), status: 500 },
        { error: AppError.fathomApi("API error"), status: 502 },
        { error: AppError.forbidden("Access denied"), status: 403 },
      ];

      for (const { error, status } of testCases) {
        const req = createMockRequest();
        const res = createMockResponse();

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(status);
      }
    });

    it("handles ZodError with 400 status", () => {
      const schema = z.object({ email: z.string() });
      let error: z.ZodError | undefined;
      try {
        schema.parse({ email: 123 });
      } catch (e) {
        error = e as z.ZodError;
      }

      const req = createMockRequest();
      const res = createMockResponse();

      errorHandler(error!, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "invalid_request",
        error_description: expect.any(String),
      });
    });

    it("handles ZodError with empty issues", () => {
      const error = new z.ZodError([]);
      const req = createMockRequest();
      const res = createMockResponse();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "invalid_request",
        error_description: "Invalid parameters",
      });
    });

    it("handles generic Error with 500 status", () => {
      const error = new Error("Something went wrong");
      const req = createMockRequest();
      const res = createMockResponse();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "server_error",
        error_description: "An unexpected error occurred",
      });
    });

    it("handles non-Error objects", () => {
      const error = { message: "Not an Error instance" } as Error;
      const req = createMockRequest();
      const res = createMockResponse();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
