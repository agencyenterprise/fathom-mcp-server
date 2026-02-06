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

const mockToolServerClose = vi.fn();
const mockMcpServerConnect = vi.fn();

vi.mock("../../../tools/server", () => ({
  ToolServer: class MockToolServer {
    getServer = vi.fn().mockReturnValue({
      connect: mockMcpServerConnect,
    });
    close = mockToolServerClose;
  },
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

import { cleanupExpiredMcpServerOAuthData } from "../../../modules/oauth/service";
import { SessionManager } from "../../../modules/sessions/manager";
import {
  deleteSessionsByIds,
  findExpiredSessionIds,
  insertSession,
  markSessionTerminated,
} from "../../../modules/sessions/service";

describe("SessionManager", () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockToolServerClose.mockClear();
    mockMcpServerConnect.mockClear();
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
  });

  describe("retrieveSession", () => {
    it("returns null for non-existent session", async () => {
      const result = await sessionManager.retrieveSession("nonexistent");

      expect(result).toBeNull();
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
      });

      await sessionManager.cleanupExpiredData();

      expect(deleteSessionsByIds).not.toHaveBeenCalled();
    });

    it("handles cleanup errors gracefully", async () => {
      vi.mocked(findExpiredSessionIds).mockRejectedValue(new Error("DB error"));

      await expect(sessionManager.cleanupExpiredData()).resolves.not.toThrow();
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

      // Advance past idle TTL (5 minutes)
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

      // Advance only 2 minutes (under 5 min TTL)
      vi.advanceTimersByTime(2 * 60 * 1000);

      await sessionManager.reapIdleTransports();

      expect(
        sessionManager.getActiveTransport("mock-session-id"),
      ).toBeDefined();
    });

    it("does nothing when no transports are idle", async () => {
      await sessionManager.reapIdleTransports();

      expect(markSessionTerminated).not.toHaveBeenCalled();
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
  });

  describe("startCleanupScheduler", () => {
    it("starts cleanup and reaper intervals", () => {
      sessionManager.startCleanupScheduler();

      // 2 intervals: hourly cleanup + 60s reaper
      expect(vi.getTimerCount()).toBe(2);
    });

    it("does not start duplicate scheduler", () => {
      sessionManager.startCleanupScheduler();
      sessionManager.startCleanupScheduler();

      expect(vi.getTimerCount()).toBe(2);
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
  });
});
