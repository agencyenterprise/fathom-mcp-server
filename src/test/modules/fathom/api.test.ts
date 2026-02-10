import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FathomAPIClient } from "../../../modules/fathom/api";

vi.mock("../../../modules/oauth/controller", () => ({
  fetchFathomOAuthToken: vi.fn(),
}));

vi.mock("../../../db", () => ({
  db: {},
}));

import { fetchFathomOAuthToken } from "../../../modules/oauth/controller";

function createMockFetchResponse(data: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

describe("FathomAPIClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("listMeetings", () => {
    it("fetches meetings without params", async () => {
      const mockResponse = {
        items: [],
        limit: 20,
        next_cursor: null,
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse)),
      );

      const client = new FathomAPIClient("test-token");
      const result = await client.listMeetings();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/meetings"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
      expect(result.items).toEqual([]);
    });

    it("builds query params correctly", async () => {
      const mockResponse = {
        items: [],
        limit: 20,
        next_cursor: null,
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse)),
      );

      const client = new FathomAPIClient("test-token");
      await client.listMeetings({
        teams: ["sales", "engineering"],
        cursor: "page-2",
        include_action_items: true,
      });

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain("teams%5B%5D=sales");
      expect(callUrl).toContain("teams%5B%5D=engineering");
      expect(callUrl).toContain("cursor=page-2");
      expect(callUrl).toContain("include_action_items=true");
    });

    it("handles array params with multiple values", async () => {
      const mockResponse = { items: [], limit: 20, next_cursor: null };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse)),
      );

      const client = new FathomAPIClient("test-token");
      await client.listMeetings({
        calendar_invitees_domains: ["example.com", "test.com"],
        recorded_by: ["user1@example.com", "user2@example.com"],
      });

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain("calendar_invitees_domains%5B%5D=example.com");
      expect(callUrl).toContain("calendar_invitees_domains%5B%5D=test.com");
      expect(callUrl).toContain("recorded_by%5B%5D=user1%40example.com");
      expect(callUrl).toContain("recorded_by%5B%5D=user2%40example.com");
    });

    it("throws on API error", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            createMockFetchResponse({ error: "Unauthorized" }, false),
          ),
      );

      const client = new FathomAPIClient("bad-token");

      await expect(client.listMeetings()).rejects.toThrow();
    });
  });

  describe("getTranscript", () => {
    it("fetches transcript for recording", async () => {
      const mockResponse = {
        transcript: [
          {
            speaker: { display_name: "John" },
            text: "Hello",
            timestamp: "00:00:01",
          },
        ],
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse)),
      );

      const client = new FathomAPIClient("test-token");
      const result = await client.getTranscript("recording-123");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/recordings/recording-123/transcript"),
        expect.any(Object),
      );
      expect(result.transcript).toHaveLength(1);
    });
  });

  describe("getSummary", () => {
    it("fetches summary for recording", async () => {
      const mockResponse = {
        summary: {
          template_name: "Default",
          markdown_formatted: "# Summary\n\nKey points...",
        },
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse)),
      );

      const client = new FathomAPIClient("test-token");
      const result = await client.getSummary("recording-123");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/recordings/recording-123/summary"),
        expect.any(Object),
      );
      expect(result.summary.template_name).toBe("Default");
    });
  });

  describe("listTeams", () => {
    it("fetches teams", async () => {
      const mockResponse = {
        items: [{ name: "Engineering", created_at: "2024-01-01" }],
        limit: 20,
        next_cursor: null,
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse)),
      );

      const client = new FathomAPIClient("test-token");
      const result = await client.listTeams();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/teams"),
        expect.any(Object),
      );
      expect(result.items).toHaveLength(1);
    });

    it("passes cursor param", async () => {
      const mockResponse = { items: [], limit: 20, next_cursor: null };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse)),
      );

      const client = new FathomAPIClient("test-token");
      await client.listTeams("page-2");

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain("cursor=page-2");
    });
  });

  describe("listTeamMembers", () => {
    it("fetches team members", async () => {
      const mockResponse = {
        items: [
          {
            name: "John Doe",
            email: "john@example.com",
            created_at: "2024-01-01",
          },
        ],
        limit: 20,
        next_cursor: null,
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse)),
      );

      const client = new FathomAPIClient("test-token");
      const result = await client.listTeamMembers("Engineering");

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain("/team_members");
      expect(callUrl).toContain("team=Engineering");
      expect(result.items).toHaveLength(1);
    });
  });

  describe("createAuthorizedService", () => {
    it("creates client with fetched token", async () => {
      vi.mocked(fetchFathomOAuthToken).mockResolvedValue("user-access-token");

      const client = await FathomAPIClient.createAuthorizedService("user-123");

      expect(fetchFathomOAuthToken).toHaveBeenCalledWith("user-123");
      expect(client).toBeInstanceOf(FathomAPIClient);
    });

    it("throws when no token found", async () => {
      vi.mocked(fetchFathomOAuthToken).mockResolvedValue(null);

      await expect(
        FathomAPIClient.createAuthorizedService("user-123"),
      ).rejects.toThrow();
    });
  });

  describe("timeout handling", () => {
    it("aborts request on timeout", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            }, 35000);
          });
        }),
      );

      const client = new FathomAPIClient("test-token");
      const promise = client.listMeetings();

      vi.advanceTimersByTime(35000);

      await expect(promise).rejects.toThrow();
    });
  });
});
