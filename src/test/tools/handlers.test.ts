import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FathomAPIClient } from "../../modules/fathom/api";
import { AppError } from "../../shared/errors";
import {
  getSummary,
  getTranscript,
  listMeetings,
  listTeamMembers,
  listTeams,
  searchMeetings,
} from "../../tools/handlers";

vi.mock("../../modules/fathom/api");
vi.mock("../../db", () => ({ db: {} }));

function createMockClient() {
  return {
    listMeetings: vi.fn(),
    getTranscript: vi.fn(),
    getSummary: vi.fn(),
    listTeams: vi.fn(),
    listTeamMembers: vi.fn(),
  };
}

function getTextContent(result: CallToolResult): string {
  const content = result.content[0];
  if (content.type === "text") {
    return content.text;
  }
  throw new Error(`Expected text content, got ${content.type}`);
}

describe("tools/handlers", () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(FathomAPIClient.createAuthorizedService).mockResolvedValue(
      mockClient as unknown as FathomAPIClient,
    );
  });

  describe("listMeetings", () => {
    it("returns meetings on success", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [{ title: "Weekly Standup", recording_id: 123 }],
        limit: 20,
        next_cursor: null,
      });

      const result = await listMeetings("user-123", {});

      expect(result.isError).toBeUndefined();
      expect(getTextContent(result)).toContain("Weekly Standup");
    });

    it("passes params to API", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [],
        limit: 20,
        next_cursor: null,
      });

      await listMeetings("user-123", {
        teams: ["engineering"],
        cursor: "page-2",
      });

      expect(mockClient.listMeetings).toHaveBeenCalledWith({
        teams: ["engineering"],
        cursor: "page-2",
      });
    });

    it("returns error on ZodError", async () => {
      const result = await listMeetings("user-123", {
        recorded_by: ["not-an-email"],
      });

      expect(result.isError).toBe(true);
    });

    it("returns error on AppError", async () => {
      vi.mocked(FathomAPIClient.createAuthorizedService).mockRejectedValue(
        AppError.auth("no_token", "No token found"),
      );

      const result = await listMeetings("user-123", {});

      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toContain("No token found");
    });

    it("returns generic error on unexpected error", async () => {
      vi.mocked(FathomAPIClient.createAuthorizedService).mockRejectedValue(
        new Error("Network error"),
      );

      const result = await listMeetings("user-123", {});

      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toBe("An unexpected error occurred");
    });
  });

  describe("getTranscript", () => {
    it("returns transcript on success", async () => {
      mockClient.getTranscript.mockResolvedValue({
        transcript: [
          {
            speaker: { display_name: "John" },
            text: "Hello everyone",
            timestamp: "00:00:01",
          },
        ],
      });

      const result = await getTranscript("user-123", {
        recording_id: 456,
      });

      expect(result.isError).toBeUndefined();
      expect(getTextContent(result)).toContain("Hello everyone");
    });

    it("returns error when recording_id missing", async () => {
      const result = await getTranscript("user-123", {});

      expect(result.isError).toBe(true);
    });

    it("returns error when recording_id empty", async () => {
      const result = await getTranscript("user-123", { recording_id: "" });

      expect(result.isError).toBe(true);
    });
  });

  describe("getSummary", () => {
    it("returns summary on success", async () => {
      mockClient.getSummary.mockResolvedValue({
        summary: {
          template_name: "Default",
          markdown_formatted: "# Summary\n\nKey points discussed...",
        },
      });

      const result = await getSummary("user-123", {
        recording_id: 456,
      });

      expect(result.isError).toBeUndefined();
      expect(getTextContent(result)).toContain("Key points discussed");
    });

    it("returns error when recording_id missing", async () => {
      const result = await getSummary("user-123", {});

      expect(result.isError).toBe(true);
    });
  });

  describe("listTeams", () => {
    it("returns teams on success", async () => {
      mockClient.listTeams.mockResolvedValue({
        items: [{ name: "Engineering", created_at: "2024-01-01" }],
        limit: 20,
        next_cursor: null,
      });

      const result = await listTeams("user-123", {});

      expect(result.isError).toBeUndefined();
      expect(getTextContent(result)).toContain("Engineering");
    });

    it("passes cursor to API", async () => {
      mockClient.listTeams.mockResolvedValue({
        items: [],
        limit: 20,
        next_cursor: null,
      });

      await listTeams("user-123", { cursor: "page-2" });

      expect(mockClient.listTeams).toHaveBeenCalledWith("page-2");
    });
  });

  describe("listTeamMembers", () => {
    it("returns team members on success", async () => {
      mockClient.listTeamMembers.mockResolvedValue({
        items: [
          {
            name: "Jane Doe",
            email: "jane@example.com",
            created_at: "2024-01-01",
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await listTeamMembers("user-123", { team: "Engineering" });

      expect(result.isError).toBeUndefined();
      expect(getTextContent(result)).toContain("Jane Doe");
    });

    it("passes team and cursor to API", async () => {
      mockClient.listTeamMembers.mockResolvedValue({
        items: [],
        limit: 20,
        next_cursor: null,
      });

      await listTeamMembers("user-123", { team: "Sales", cursor: "page-3" });

      expect(mockClient.listTeamMembers).toHaveBeenCalledWith(
        "Sales",
        "page-3",
      );
    });
  });

  describe("searchMeetings", () => {
    const noMatch = {
      recorded_by: {
        name: "Host Name",
        email: "host@example.com",
        email_domain: "example.com",
        team: null,
      },
      calendar_invitees: [],
    };

    const withInvitees = (
      invitees: { name: string | null; email: string | null }[],
    ) => ({
      recorded_by: {
        name: "Host Name",
        email: "host@example.com",
        email_domain: "example.com",
        team: null,
      },
      calendar_invitees: invitees.map((i) => ({
        ...i,
        email_domain: i.email?.split("@")[1] ?? null,
        is_external: true,
      })),
    });

    it("filters meetings by title", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "Weekly Standup",
            meeting_title: null,
            recording_id: 1,
            ...noMatch,
          },
          {
            title: "Project Review",
            meeting_title: "Sprint 5",
            recording_id: 2,
            ...noMatch,
          },
          {
            title: "1:1 with Manager",
            meeting_title: null,
            recording_id: 3,
            ...noMatch,
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await searchMeetings("user-123", { query: "standup" });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].title).toBe("Weekly Standup");
    });

    it("filters by meeting_title", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "Meeting 1",
            meeting_title: "Sprint Planning",
            recording_id: 1,
            ...noMatch,
          },
          {
            title: "Meeting 2",
            meeting_title: "Retrospective",
            recording_id: 2,
            ...noMatch,
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await searchMeetings("user-123", { query: "sprint" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].recording_id).toBe(1);
      expect(parsed.items[0].meeting_title).toBe("Sprint Planning");
    });

    it("search is case-insensitive", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "WEEKLY STANDUP",
            meeting_title: null,
            recording_id: 1,
            ...noMatch,
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await searchMeetings("user-123", { query: "weekly" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].title).toBe("WEEKLY STANDUP");
      expect(parsed.items[0].recording_id).toBe(1);
    });

    it("matches on recorded_by name", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "Q4 Planning",
            meeting_title: null,
            recording_id: 1,
            recorded_by: {
              name: "Alice Johnson",
              email: "alice@example.com",
              email_domain: "example.com",
              team: null,
            },
            calendar_invitees: [],
          },
          {
            title: "Budget Review",
            meeting_title: null,
            recording_id: 2,
            recorded_by: {
              name: "Bob Smith",
              email: "bob@example.com",
              email_domain: "example.com",
              team: null,
            },
            calendar_invitees: [],
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await searchMeetings("user-123", { query: "alice" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].recording_id).toBe(1);
    });

    it("matches on recorded_by email", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "Sync",
            meeting_title: null,
            recording_id: 1,
            recorded_by: {
              name: "Alice Johnson",
              email: "alice@acme.com",
              email_domain: "acme.com",
              team: null,
            },
            calendar_invitees: [],
          },
          {
            title: "Standup",
            meeting_title: null,
            recording_id: 2,
            recorded_by: {
              name: "Bob Smith",
              email: "bob@other.com",
              email_domain: "other.com",
              team: null,
            },
            calendar_invitees: [],
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await searchMeetings("user-123", { query: "acme.com" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].recording_id).toBe(1);
    });

    it("matches on calendar invitee name", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "Demo",
            meeting_title: null,
            recording_id: 1,
            ...withInvitees([
              { name: "Jane Prospect", email: "jane@prospect.com" },
            ]),
          },
          {
            title: "Internal Sync",
            meeting_title: null,
            recording_id: 2,
            ...withInvitees([
              { name: "Internal User", email: "user@internal.com" },
            ]),
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await searchMeetings("user-123", { query: "prospect" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].recording_id).toBe(1);
    });

    it("matches on calendar invitee email", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "Sales Call",
            meeting_title: null,
            recording_id: 1,
            ...withInvitees([{ name: "Buyer", email: "buyer@bigcorp.com" }]),
          },
          {
            title: "Team Sync",
            meeting_title: null,
            recording_id: 2,
            ...withInvitees([
              { name: "Teammate", email: "teammate@internal.com" },
            ]),
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await searchMeetings("user-123", { query: "bigcorp" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].recording_id).toBe(1);
    });

    it("returns no matches when query does not match any field", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "Weekly Standup",
            meeting_title: null,
            recording_id: 1,
            ...noMatch,
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await searchMeetings("user-123", { query: "zzznomatch" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(0);
    });

    it("fetches subsequent pages when first page has no matches", async () => {
      mockClient.listMeetings
        .mockResolvedValueOnce({
          items: [
            {
              title: "No Match",
              meeting_title: null,
              recording_id: 1,
              ...noMatch,
            },
          ],
          limit: 20,
          next_cursor: "page-2",
        })
        .mockResolvedValueOnce({
          items: [
            {
              title: "Target Meeting",
              meeting_title: null,
              recording_id: 2,
              ...noMatch,
            },
          ],
          limit: 20,
          next_cursor: null,
        });

      const result = await searchMeetings("user-123", { query: "target" });

      expect(mockClient.listMeetings).toHaveBeenCalledTimes(2);
      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].recording_id).toBe(2);
    });

    it("collects matches across multiple pages", async () => {
      mockClient.listMeetings
        .mockResolvedValueOnce({
          items: [
            {
              title: "Sprint Review Page 1",
              meeting_title: null,
              recording_id: 1,
              ...noMatch,
            },
          ],
          limit: 20,
          next_cursor: "page-2",
        })
        .mockResolvedValueOnce({
          items: [
            {
              title: "Sprint Review Page 2",
              meeting_title: null,
              recording_id: 2,
              ...noMatch,
            },
          ],
          limit: 20,
          next_cursor: null,
        });

      const result = await searchMeetings("user-123", { query: "sprint" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].recording_id).toBe(1);
      expect(parsed.items[1].recording_id).toBe(2);
    });

    it("stops after MAX_SEARCH_PAGES even when next_cursor is still present", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "No Match",
            meeting_title: null,
            recording_id: 1,
            ...noMatch,
          },
        ],
        limit: 20,
        next_cursor: "always-more",
      });

      await searchMeetings("user-123", { query: "target" });

      expect(mockClient.listMeetings).toHaveBeenCalledTimes(5);
    });

    it("stops early when next_cursor is null before hitting page limit", async () => {
      mockClient.listMeetings.mockResolvedValueOnce({
        items: [
          {
            title: "Only Page",
            meeting_title: null,
            recording_id: 1,
            ...noMatch,
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      await searchMeetings("user-123", { query: "only" });

      expect(mockClient.listMeetings).toHaveBeenCalledTimes(1);
    });

    it("response includes total_searched count across all pages", async () => {
      mockClient.listMeetings
        .mockResolvedValueOnce({
          items: [
            {
              title: "Meeting A",
              meeting_title: null,
              recording_id: 1,
              ...noMatch,
            },
            {
              title: "Meeting B",
              meeting_title: null,
              recording_id: 2,
              ...noMatch,
            },
          ],
          limit: 20,
          next_cursor: "page-2",
        })
        .mockResolvedValueOnce({
          items: [
            {
              title: "Meeting C",
              meeting_title: null,
              recording_id: 3,
              ...noMatch,
            },
          ],
          limit: 20,
          next_cursor: null,
        });

      const result = await searchMeetings("user-123", { query: "zzznomatch" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.total_searched).toBe(3);
    });

    it("response includes null next_cursor when all pages exhausted", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "Meeting",
            meeting_title: null,
            recording_id: 1,
            ...noMatch,
          },
        ],
        limit: 20,
        next_cursor: null,
      });

      const result = await searchMeetings("user-123", { query: "meeting" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.next_cursor).toBeNull();
    });

    it("response includes non-null next_cursor when stopped at page limit", async () => {
      mockClient.listMeetings.mockResolvedValue({
        items: [
          {
            title: "No Match",
            meeting_title: null,
            recording_id: 1,
            ...noMatch,
          },
        ],
        limit: 20,
        next_cursor: "always-more",
      });

      const result = await searchMeetings("user-123", { query: "target" });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.next_cursor).toBe("always-more");
    });

    it("returns error when query missing", async () => {
      const result = await searchMeetings("user-123", {});

      expect(result.isError).toBe(true);
    });

    it("returns error when query empty", async () => {
      const result = await searchMeetings("user-123", { query: "" });

      expect(result.isError).toBe(true);
    });
  });
});
