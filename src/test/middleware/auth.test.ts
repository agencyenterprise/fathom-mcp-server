import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { McpServerAccessToken } from "../../db/schema";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("../../modules/oauth/service");

import { getMcpServerAccessToken } from "../../modules/oauth/service";
import { bearerAuthMiddleware } from "../../middleware/auth";

function createMockRequest(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    userId: undefined,
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as Request;
}

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createMockAccessToken(
  overrides: Partial<McpServerAccessToken> = {},
): McpServerAccessToken {
  return {
    id: "mock-id",
    token: "valid-token",
    userId: "user-123",
    scope: "fathom:read",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60000),
    ...overrides,
  };
}

describe("middleware/auth", () => {
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("bearerAuthMiddleware", () => {
    it("returns 401 when authorization header missing", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await bearerAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "unauthorized",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when authorization header does not start with Bearer", async () => {
      const req = createMockRequest("Basic dXNlcjpwYXNz");
      const res = createMockResponse();

      await bearerAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when token not found", async () => {
      vi.mocked(getMcpServerAccessToken).mockResolvedValue(null);

      const req = createMockRequest("Bearer invalid-token");
      const res = createMockResponse();

      await bearerAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "invalid_token",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("sets userId and calls next on valid token", async () => {
      vi.mocked(getMcpServerAccessToken).mockResolvedValue(
        createMockAccessToken(),
      );

      const req = createMockRequest("Bearer valid-token");
      const res = createMockResponse();

      await bearerAuthMiddleware(req, res, next);

      expect(req.userId).toBe("user-123");
      expect(next).toHaveBeenCalled();
    });

    it("sets WWW-Authenticate header on 401", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await bearerAuthMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "WWW-Authenticate",
        expect.stringContaining("Bearer"),
      );
    });

    it("returns 500 on unexpected error", async () => {
      vi.mocked(getMcpServerAccessToken).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const req = createMockRequest("Bearer some-token");
      const res = createMockResponse();

      await bearerAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "server_error",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
