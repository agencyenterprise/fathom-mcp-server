import { describe, expect, it } from "vitest";
import { AppError } from "../../shared/errors";

describe("AppError", () => {
  describe("constructor", () => {
    it("creates an error with all properties", () => {
      const error = new AppError(
        400,
        "test_code",
        "Test message",
        "validation",
        "test_name",
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("test_code");
      expect(error.message).toBe("Test message");
      expect(error.errorType).toBe("validation");
      expect(error.errorName).toBe("test_name");
      expect(error.name).toBe("AppError");
    });

    it("defaults errorName to code when not provided", () => {
      const error = new AppError(400, "test_code", "Test message", "auth");

      expect(error.errorName).toBe("test_code");
    });
  });

  describe("static factory methods", () => {
    it("auth creates a 401 error", () => {
      const error = AppError.auth("unauthorized", "Not authorized");

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("unauthorized");
      expect(error.message).toBe("Not authorized");
      expect(error.errorType).toBe("auth");
    });

    it("auth accepts optional errorName", () => {
      const error = AppError.auth("code", "message", "custom_name");

      expect(error.errorName).toBe("custom_name");
    });

    it("forbidden creates a 403 error", () => {
      const error = AppError.forbidden("Access denied");

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("forbidden");
      expect(error.message).toBe("Access denied");
      expect(error.errorType).toBe("auth");
    });

    it("oauth creates a 400 error", () => {
      const error = AppError.oauth("invalid_grant", "Grant expired");

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("invalid_grant");
      expect(error.message).toBe("Grant expired");
      expect(error.errorType).toBe("oauth");
    });

    it("validation creates a 400 error with invalid_request code", () => {
      const error = AppError.validation("Invalid input");

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("invalid_request");
      expect(error.message).toBe("Invalid input");
      expect(error.errorType).toBe("validation");
    });

    it("session creates a 400 error", () => {
      const error = AppError.session("session_expired", "Session expired");

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("session_expired");
      expect(error.message).toBe("Session expired");
      expect(error.errorType).toBe("session");
    });

    it("fathomApi creates a 502 error", () => {
      const error = AppError.fathomApi("API timeout");

      expect(error.statusCode).toBe(502);
      expect(error.code).toBe("fathom_api_error");
      expect(error.message).toBe("API timeout");
      expect(error.errorType).toBe("fathom_api");
    });

    it("notFound creates a 404 error with formatted message", () => {
      const error = AppError.notFound("Session");

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("not_found");
      expect(error.message).toBe("Session not found");
      expect(error.errorType).toBe("server");
    });

    it("server creates a 500 error", () => {
      const error = AppError.server("Internal error");

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("server_error");
      expect(error.message).toBe("Internal error");
      expect(error.errorType).toBe("server");
    });
  });

  describe("inheritance", () => {
    it("is an instance of Error", () => {
      const error = AppError.server("Test");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it("has a stack trace", () => {
      const error = AppError.server("Test");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AppError");
    });
  });
});
