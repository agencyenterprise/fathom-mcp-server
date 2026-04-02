import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({ db: {} }));

vi.mock("../../../modules/sessions/service", () => ({
  insertSession: vi.fn(),
  markSessionTerminated: vi.fn(),
  findExpiredSessionIds: vi.fn(),
  deleteSessionsByIds: vi.fn(),
}));

vi.mock("../../../modules/oauth/service", () => ({
  cleanupExpiredMcpServerOAuthData: vi.fn(),
}));

const { mockServerClose, mockServerConnect } = vi.hoisted(() => ({
  mockServerClose: vi.fn(),
  mockServerConnect: vi.fn(),
}));

vi.mock("../../../tools/server", () => ({
  createToolServer: vi.fn().mockReturnValue({
    connect: mockServerConnect,
    close: mockServerClose,
  }),
}));

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: class MockTransport {
    sessionId = "mock-session-id";
    close = vi.fn().mockResolvedValue(undefined);
    handleRequest = vi.fn();
    onclose: (() => void) | null = null;

    constructor(config: { onsessioninitialized?: (id: string) => void }) {
      if (config.onsessioninitialized) {
        setTimeout(() => config.onsessioninitialized?.("mock-session-id"), 0);
      }
    }
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/sse.js", () => ({
  SSEServerTransport: class MockSseTransport {
    sessionId = "mock-sse-session-id";
    handlePostMessage = vi.fn();
    onclose: (() => void) | null = null;

    constructor(_endpoint: string, _res: unknown) {}
  },
}));

import { cleanupExpiredMcpServerOAuthData } from "../../../modules/oauth/service";
import { SessionManager } from "../../../modules/sessions/manager";
import {
  deleteSessionsByIds,
  findExpiredSessionIds,
  insertSession,
  markSessionTerminated,
} from "../../../modules/sessions/service";
import {
  IDLE_TRANSPORT_TTL_MS,
  SESSION_CLEANUP_INTERVAL_MS,
} from "../../../shared/constants";

describe("SessionManager", () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServerClose.mockClear();
    mockServerConnect.mockClear();
    vi.useFakeTimers();
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    sessionManager.stopCleanupScheduler();
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("creates session manager with empty transports", () => {
      expect(sessionManager).toBeDefined();
      expect(sessionManager.getActiveTransport("nonexistent")).toBeUndefined();
    });
  });

  describe("createSession", () => {
    it("creates and returns transport", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);

      const transport = await sessionManager.createSession("user-123");

      expect(transport).toBeDefined();
    });

    it("removes transport and persists termination when transport closes", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      const transport = await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeDefined();

      await transport.onclose?.();

      expect(markSessionTerminated).toHaveBeenCalledWith("mock-session-id");
      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeUndefined();
    });
  });

  describe("retrieveSession", () => {
    it("returns null for non-existent session", async () => {
      const result = await sessionManager.retrieveSession("nonexistent");

      expect(result).toBeNull();
    });

    it("returns the cached transport for an active session", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      const result = await sessionManager.retrieveSession("mock-session-id");

      expect(result).toBeDefined();
      expect(result?.userId).toBe("user-123");
    });
  });

  describe("terminateSession", () => {
    it("marks session as terminated", async () => {
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      await sessionManager.terminateSession("session-123");

      expect(markSessionTerminated).toHaveBeenCalledWith("session-123");
    });

    it("throws AppError when persistTermination fails", async () => {
      vi.mocked(markSessionTerminated).mockRejectedValue(new Error("DB error"));

      await expect(
        sessionManager.terminateSession("session-123"),
      ).rejects.toThrow("Failed to terminate session");
    });

    it("closes the active server when terminating a session that is in memory", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeDefined();

      await sessionManager.terminateSession("mock-session-id");

      expect(mockServerClose).toHaveBeenCalled();
      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeUndefined();
    });

    it("logs error and continues when server close throws during termination", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      mockServerClose.mockRejectedValueOnce(new Error("close failed"));

      await expect(
        sessionManager.terminateSession("mock-session-id"),
      ).resolves.not.toThrow();

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeUndefined();
    });
  });

  describe("getActiveTransport", () => {
    it("returns undefined for unknown session", () => {
      const result = sessionManager.getActiveTransport("unknown");

      expect(result).toBeUndefined();
    });
  });

  describe("cleanupExpiredData", () => {
    it("cleans up expired sessions and oauth data", async () => {
      vi.mocked(findExpiredSessionIds).mockResolvedValue([
        "expired-1",
        "expired-2",
      ]);
      vi.mocked(deleteSessionsByIds).mockResolvedValue(undefined);
      vi.mocked(cleanupExpiredMcpServerOAuthData).mockResolvedValue({
        oauthStates: 1,
        authorizationCodes: 2,
        accessTokens: 3,
        refreshTokens: 0,
        fathomTokens: 0,
      });

      await sessionManager.cleanupExpiredData();

      expect(findExpiredSessionIds).toHaveBeenCalled();
      expect(deleteSessionsByIds).toHaveBeenCalledWith([
        "expired-1",
        "expired-2",
      ]);
      expect(cleanupExpiredMcpServerOAuthData).toHaveBeenCalled();
    });

    it("handles empty expired sessions", async () => {
      vi.mocked(findExpiredSessionIds).mockResolvedValue([]);
      vi.mocked(cleanupExpiredMcpServerOAuthData).mockResolvedValue({
        oauthStates: 0,
        authorizationCodes: 0,
        accessTokens: 0,
        refreshTokens: 0,
        fathomTokens: 0,
      });

      await sessionManager.cleanupExpiredData();

      expect(deleteSessionsByIds).not.toHaveBeenCalled();
    });

    it("handles cleanup errors gracefully", async () => {
      vi.mocked(findExpiredSessionIds).mockRejectedValue(new Error("DB error"));

      await expect(sessionManager.cleanupExpiredData()).resolves.not.toThrow();
    });

    it("closes and removes an in-memory transport whose session has expired", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeDefined();

      vi.mocked(findExpiredSessionIds).mockResolvedValue(["mock-session-id"]);
      vi.mocked(deleteSessionsByIds).mockResolvedValue(undefined);
      vi.mocked(cleanupExpiredMcpServerOAuthData).mockResolvedValue({
        oauthStates: 0,
        authorizationCodes: 0,
        accessTokens: 0,
        refreshTokens: 0,
        fathomTokens: 0,
      });

      await sessionManager.cleanupExpiredData();

      expect(deleteSessionsByIds).toHaveBeenCalledWith(["mock-session-id"]);
      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeUndefined();
    });

    it("logs error and continues when server close throws during expired session cleanup", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      mockServerClose.mockRejectedValueOnce(new Error("server close failed"));

      vi.mocked(findExpiredSessionIds).mockResolvedValue(["mock-session-id"]);
      vi.mocked(deleteSessionsByIds).mockResolvedValue(undefined);
      vi.mocked(cleanupExpiredMcpServerOAuthData).mockResolvedValue({
        oauthStates: 0,
        authorizationCodes: 0,
        accessTokens: 0,
        refreshTokens: 0,
        fathomTokens: 0,
      });

      await expect(sessionManager.cleanupExpiredData()).resolves.not.toThrow();
      expect(deleteSessionsByIds).toHaveBeenCalledWith(["mock-session-id"]);
    });
  });

  describe("reapIdleTransports", () => {
    it("reaps transports idle beyond IDLE_TRANSPORT_TTL_MS", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeDefined();

      vi.advanceTimersByTime(6 * 60 * 1000);

      await sessionManager.reapIdleTransports();

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeUndefined();
      expect(markSessionTerminated).toHaveBeenCalledWith("mock-session-id");
    });

    it("leaves recently accessed transports alone", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      vi.advanceTimersByTime(2 * 60 * 1000);

      await sessionManager.reapIdleTransports();

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeDefined();
    });

    it("reaps idle SSE transports beyond IDLE_TRANSPORT_TTL_MS", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);
      const mockRes = {} as unknown;

      await sessionManager.createSseSession("user-sse", mockRes as never);

      vi.advanceTimersByTime(6 * 60 * 1000);

      await sessionManager.reapIdleTransports();

      expect(
        sessionManager.getActiveTransport("mock-sse-session-id"),
      ).toBeUndefined();
      expect(markSessionTerminated).toHaveBeenCalledWith("mock-sse-session-id");
    });

    it("handles transport close errors gracefully", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      const transport = await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      vi.mocked(transport.close).mockRejectedValueOnce(
        new Error("close failed"),
      );

      vi.advanceTimersByTime(6 * 60 * 1000);

      await expect(sessionManager.reapIdleTransports()).resolves.not.toThrow();

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeUndefined();
    });

    it("logs error and continues when server close throws while reaping", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      mockServerClose.mockRejectedValueOnce(new Error("server close failed"));

      vi.advanceTimersByTime(6 * 60 * 1000);

      await expect(sessionManager.reapIdleTransports()).resolves.not.toThrow();

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeUndefined();
    });
  });

  describe("startCleanupScheduler", () => {
    it("starts cleanup and reaper intervals", () => {
      sessionManager.startCleanupScheduler();

      expect(vi.getTimerCount()).toBe(2);
    });

    it("does not start duplicate scheduler", () => {
      sessionManager.startCleanupScheduler();
      sessionManager.startCleanupScheduler();

      expect(vi.getTimerCount()).toBe(2);
    });

    it("fires cleanupExpiredData when the cleanup interval elapses", async () => {
      vi.mocked(findExpiredSessionIds).mockResolvedValue([]);
      vi.mocked(cleanupExpiredMcpServerOAuthData).mockResolvedValue({
        oauthStates: 0,
        authorizationCodes: 0,
        accessTokens: 0,
        refreshTokens: 0,
        fathomTokens: 0,
      });

      sessionManager.startCleanupScheduler();
      await vi.advanceTimersByTimeAsync(SESSION_CLEANUP_INTERVAL_MS);

      expect(findExpiredSessionIds).toHaveBeenCalled();
    });

    it("fires reapIdleTransports when the reaper interval elapses", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      sessionManager.startCleanupScheduler();
      await vi.advanceTimersByTimeAsync(
        SESSION_CLEANUP_INTERVAL_MS + IDLE_TRANSPORT_TTL_MS,
      );

      expect(markSessionTerminated).toHaveBeenCalledWith("mock-session-id");
    });
  });

  describe("stopCleanupScheduler", () => {
    it("stops both cleanup and reaper intervals", () => {
      sessionManager.startCleanupScheduler();
      sessionManager.stopCleanupScheduler();

      expect(vi.getTimerCount()).toBe(0);
    });

    it("handles stop when not running", () => {
      expect(() => sessionManager.stopCleanupScheduler()).not.toThrow();
    });
  });

  describe("shutdown", () => {
    it("stops scheduler and closes transports", async () => {
      sessionManager.startCleanupScheduler();
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);

      await sessionManager.shutdown();

      expect(vi.getTimerCount()).toBe(0);
    });

    it("logs error and completes shutdown when persistTermination throws", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockRejectedValue(new Error("DB error"));

      await sessionManager.createSession("user-123");
      await vi.advanceTimersByTimeAsync(0);

      await expect(sessionManager.shutdown()).resolves.not.toThrow();

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeUndefined();
    });
  });

  describe("createSseSession", () => {
    it("creates an SSE session and caches it", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      const mockRes = {} as unknown;

      await sessionManager.createSseSession("user-123", mockRes as never);

      expect(insertSession).toHaveBeenCalledWith(
        "mock-sse-session-id",
        "user-123",
      );
      expect(mockServerConnect).toHaveBeenCalled();
    });

    it("throws and does not cache when insertSession fails", async () => {
      vi.mocked(insertSession).mockRejectedValue(new Error("DB error"));
      const mockRes = {} as unknown;

      await expect(
        sessionManager.createSseSession("user-123", mockRes as never),
      ).rejects.toThrow("DB error");
    });

    it("removes SSE transport and persists termination when transport closes", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      vi.mocked(markSessionTerminated).mockResolvedValue(undefined);
      const mockRes = {} as unknown;

      await sessionManager.createSseSession("user-123", mockRes as never);

      expect(
        sessionManager.getActiveTransport("mock-sse-session-id"),
      ).toBeDefined();

      const entry = sessionManager.getActiveTransport(
        "mock-sse-session-id",
      ) as {
        transport: { onclose?: () => Promise<void> };
      };
      await entry.transport.onclose?.();

      expect(markSessionTerminated).toHaveBeenCalledWith("mock-sse-session-id");
      expect(
        sessionManager.getActiveTransport("mock-sse-session-id"),
      ).toBeUndefined();
    });
  });

  describe("handleSseMessage", () => {
    it("throws when SSE session not found", async () => {
      const mockReq = {} as never;
      const mockRes = {} as never;

      await expect(
        sessionManager.handleSseMessage(
          "nonexistent",
          "user-123",
          mockReq,
          mockRes,
        ),
      ).rejects.toThrow();
    });

    it("throws when session belongs to a different user", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      const mockRes = {} as unknown;

      await sessionManager.createSseSession("user-123", mockRes as never);

      await expect(
        sessionManager.handleSseMessage(
          "mock-sse-session-id",
          "different-user",
          {} as never,
          {} as never,
        ),
      ).rejects.toThrow();
    });

    it("delegates to handlePostMessage on the SSE transport", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      const mockRes = {} as unknown;

      await sessionManager.createSseSession("user-123", mockRes as never);

      await sessionManager.handleSseMessage(
        "mock-sse-session-id",
        "user-123",
        {} as never,
        {} as never,
      );

      expect(mockServerConnect).toHaveBeenCalled();
    });
  });

  describe("active transport count", () => {
    it("counts both HTTP and SSE transports together when logging", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      const mockRes = {} as unknown;

      await sessionManager.createSseSession("user-sse", mockRes as never);

      const loggerInfoSpy = vi.spyOn(
        (await import("../../../middleware/logger")).logger,
        "info",
      );

      await sessionManager.createSession("user-http");
      await vi.advanceTimersByTimeAsync(0);

      const transportLogCall = loggerInfoSpy.mock.calls.find(
        (call) => call[1] === "Transport stored in memory",
      );

      expect(transportLogCall).toBeDefined();
      expect(
        (transportLogCall![0] as { activeCount: number }).activeCount,
      ).toBe(2);
    });

    it("getActiveTransport resolves sessions from both transport maps", async () => {
      vi.mocked(insertSession).mockResolvedValue(undefined);
      const mockRes = {} as unknown;

      await sessionManager.createSseSession("user-sse", mockRes as never);
      await sessionManager.createSession("user-http");
      await vi.advanceTimersByTimeAsync(0);

      expect(
        sessionManager.getActiveTransport("mock-sse-session-id"),
      ).toBeDefined();
      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeDefined();
    });
  });
});
