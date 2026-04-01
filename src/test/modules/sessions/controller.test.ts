import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({ db: {} }));

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  isInitializeRequest: vi.fn(),
}));

import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  retrieveAuthenticatedSession,
  routeToSessionOrInitialize,
  terminateAuthenticatedSession,
} from "../../../modules/sessions/controller";

function createMockSessionManager() {
  return {
    createSession: vi.fn(),
    retrieveSession: vi.fn(),
    terminateSession: vi.fn(),
  };
}

function createMockRequest(overrides: Record<string, unknown> = {}) {
  const sessionManager = createMockSessionManager();
  return {
    app: { locals: { sessionManager } },
    headers: {},
    userId: "user-123",
    body: {},
    ...overrides,
    _sessionManager: sessionManager,
  } as unknown as Request & {
    _sessionManager: ReturnType<typeof createMockSessionManager>;
  };
}

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("sessions/controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("routeToSessionOrInitialize", () => {
    it("routes to existing session when sessionId provided", async () => {
      const mockTransport = { handleRequest: vi.fn() };
      const req = createMockRequest({
        headers: { "mcp-session-id": "session-123" },
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.retrieveSession.mockResolvedValue({
        transport: mockTransport,
        userId: "user-123",
      });

      await routeToSessionOrInitialize(req, res);

      expect(mockTransport.handleRequest).toHaveBeenCalled();
    });

    it("throws when session not found", async () => {
      const req = createMockRequest({
        headers: { "mcp-session-id": "nonexistent" },
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.retrieveSession.mockResolvedValue(null);

      await expect(routeToSessionOrInitialize(req, res)).rejects.toThrow();
    });

    it("throws when session belongs to different user", async () => {
      const mockTransport = { handleRequest: vi.fn() };
      const req = createMockRequest({
        headers: { "mcp-session-id": "session-123" },
        userId: "user-123",
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.retrieveSession.mockResolvedValue({
        transport: mockTransport,
        userId: "different-user",
      });

      await expect(routeToSessionOrInitialize(req, res)).rejects.toThrow();
    });

    it("creates session for initialize request", async () => {
      vi.mocked(isInitializeRequest).mockReturnValue(true);
      const mockTransport = { handleRequest: vi.fn() };
      const req = createMockRequest({
        headers: {},
        body: { method: "initialize" },
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.createSession.mockResolvedValue(mockTransport);

      await routeToSessionOrInitialize(req, res);

      expect(
        (
          req as {
            _sessionManager: ReturnType<typeof createMockSessionManager>;
          }
        )._sessionManager.createSession,
      ).toHaveBeenCalledWith("user-123");
      expect(mockTransport.handleRequest).toHaveBeenCalled();
    });

    it("throws when userId missing for initialize", async () => {
      vi.mocked(isInitializeRequest).mockReturnValue(true);
      const req = createMockRequest({
        headers: {},
        userId: undefined,
        body: { method: "initialize" },
      });
      const res = createMockResponse();

      await expect(routeToSessionOrInitialize(req, res)).rejects.toThrow();
    });

    it("throws for non-initialize request without sessionId", async () => {
      vi.mocked(isInitializeRequest).mockReturnValue(false);
      const req = createMockRequest({
        headers: {},
        body: { method: "tools/list" },
      });
      const res = createMockResponse();

      await expect(routeToSessionOrInitialize(req, res)).rejects.toThrow();
    });
  });

  describe("retrieveAuthenticatedSession", () => {
    it("retrieves session and handles request", async () => {
      const mockTransport = { handleRequest: vi.fn() };
      const req = createMockRequest({
        headers: { "mcp-session-id": "session-123" },
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.retrieveSession.mockResolvedValue({
        transport: mockTransport,
        userId: "user-123",
      });

      await retrieveAuthenticatedSession(req, res);

      expect(mockTransport.handleRequest).toHaveBeenCalled();
    });

    it("throws when sessionId missing", async () => {
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();

      await expect(retrieveAuthenticatedSession(req, res)).rejects.toThrow();
    });

    it("throws when session not found", async () => {
      const req = createMockRequest({
        headers: { "mcp-session-id": "nonexistent" },
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.retrieveSession.mockResolvedValue(null);

      await expect(retrieveAuthenticatedSession(req, res)).rejects.toThrow();
    });

    it("throws when session belongs to different user", async () => {
      const mockTransport = { handleRequest: vi.fn() };
      const req = createMockRequest({
        headers: { "mcp-session-id": "session-123" },
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.retrieveSession.mockResolvedValue({
        transport: mockTransport,
        userId: "different-user",
      });

      await expect(retrieveAuthenticatedSession(req, res)).rejects.toThrow();
    });
  });

  describe("terminateAuthenticatedSession", () => {
    it("terminates session and returns 204", async () => {
      const mockTransport = { handleRequest: vi.fn() };
      const req = createMockRequest({
        headers: { "mcp-session-id": "session-123" },
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.retrieveSession.mockResolvedValue({
        transport: mockTransport,
        userId: "user-123",
      });
      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.terminateSession.mockResolvedValue(undefined);

      await terminateAuthenticatedSession(req, res);

      expect(
        (
          req as {
            _sessionManager: ReturnType<typeof createMockSessionManager>;
          }
        )._sessionManager.terminateSession,
      ).toHaveBeenCalledWith("session-123");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("throws when sessionId missing", async () => {
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();

      await expect(terminateAuthenticatedSession(req, res)).rejects.toThrow();
    });

    it("throws when session not found", async () => {
      const req = createMockRequest({
        headers: { "mcp-session-id": "nonexistent" },
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.retrieveSession.mockResolvedValue(null);

      await expect(terminateAuthenticatedSession(req, res)).rejects.toThrow();
    });

    it("throws when session belongs to different user", async () => {
      const mockTransport = { handleRequest: vi.fn() };
      const req = createMockRequest({
        headers: { "mcp-session-id": "session-123" },
      });
      const res = createMockResponse();

      (
        req as { _sessionManager: ReturnType<typeof createMockSessionManager> }
      )._sessionManager.retrieveSession.mockResolvedValue({
        transport: mockTransport,
        userId: "different-user",
      });

      await expect(terminateAuthenticatedSession(req, res)).rejects.toThrow();
    });
  });
});
