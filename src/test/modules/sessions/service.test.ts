import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  },
  mcpSessions: {},
}));

import { db } from "../../../db";
import {
  deleteSessionsByIds,
  findExpiredSessionIds,
  insertSession,
  markSessionTerminated,
} from "../../../modules/sessions/service";

describe("sessions/service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("insertSession", () => {
    it("inserts session with correct data", async () => {
      const mockValues = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as never);

      await insertSession("session-123", "user-456");

      expect(db.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "session-123",
          userId: "user-456",
          terminatedAt: null,
        }),
      );
    });

    it("sets expiresAt in the future", async () => {
      const mockValues = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as never);

      const now = Date.now();
      await insertSession("session-123", "user-456");

      const callArg = mockValues.mock.calls[0][0];
      expect(callArg.expiresAt.getTime()).toBeGreaterThan(now);
    });
  });

  describe("markSessionTerminated", () => {
    it("updates session with terminatedAt", async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as never);

      await markSessionTerminated("session-123");

      expect(db.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          terminatedAt: expect.any(Date),
        }),
      );
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("findExpiredSessionIds", () => {
    it("returns expired session ids", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { sessionId: "expired-1" },
            { sessionId: "expired-2" },
          ]),
        }),
      } as never);

      const result = await findExpiredSessionIds();

      expect(result).toEqual(["expired-1", "expired-2"]);
    });

    it("returns empty array when no expired sessions", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const result = await findExpiredSessionIds();

      expect(result).toEqual([]);
    });
  });

  describe("deleteSessionsByIds", () => {
    it("deletes sessions by ids", async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere,
      } as never);

      await deleteSessionsByIds(["session-1", "session-2"]);

      expect(db.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });

    it("does nothing when ids array is empty", async () => {
      await deleteSessionsByIds([]);

      expect(db.delete).not.toHaveBeenCalled();
    });
  });
});
