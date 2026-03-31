import { describe, expect, it } from "vitest";
import {
  getActionItemsReqSchema,
  getMeetingContextReqSchema,
  getTranscriptReqSchema,
  getWeeklyRecapReqSchema,
  listMeetingsReqSchema,
  listTeamMembersReqSchema,
  listTeamsReqSchema,
  recordingReqSchema,
  searchMeetingsReqSchema,
} from "../../shared/schemas";

describe("schemas", () => {
  describe("listMeetingsReqSchema", () => {
    it("accepts empty object", () => {
      const result = listMeetingsReqSchema.parse({});
      expect(result).toEqual({});
    });

    it("accepts all optional fields", () => {
      const input = {
        calendar_invitees_domains: ["example.com"],
        calendar_invitees_domains_type: "all" as const,
        created_after: "2024-01-01T00:00:00Z",
        created_before: "2024-12-31T23:59:59Z",
        cursor: "next-page-token",
        include_action_items: true,
        include_crm_matches: false,
        recorded_by: ["user@example.com"],
        teams: ["sales", "engineering"],
      };

      const result = listMeetingsReqSchema.parse(input);
      expect(result).toEqual(input);
    });

    it("accepts only_internal domain type", () => {
      const result = listMeetingsReqSchema.parse({
        calendar_invitees_domains_type: "only_internal",
      });
      expect(result.calendar_invitees_domains_type).toBe("only_internal");
    });

    it("accepts one_or_more_external domain type", () => {
      const result = listMeetingsReqSchema.parse({
        calendar_invitees_domains_type: "one_or_more_external",
      });
      expect(result.calendar_invitees_domains_type).toBe(
        "one_or_more_external",
      );
    });

    it("rejects invalid domain type", () => {
      expect(() =>
        listMeetingsReqSchema.parse({
          calendar_invitees_domains_type: "invalid",
        }),
      ).toThrow();
    });

    it("rejects invalid email in recorded_by", () => {
      expect(() =>
        listMeetingsReqSchema.parse({
          recorded_by: ["not-an-email"],
        }),
      ).toThrow();
    });

    it("rejects invalid datetime format", () => {
      expect(() =>
        listMeetingsReqSchema.parse({
          created_after: "invalid-date",
        }),
      ).toThrow();
    });
  });

  describe("searchMeetingsReqSchema", () => {
    it("requires query field", () => {
      expect(() => searchMeetingsReqSchema.parse({})).toThrow();
    });

    it("accepts query with all optional fields", () => {
      const input = {
        query: "weekly standup",
        teams: ["engineering"],
        cursor: "token",
      };

      const result = searchMeetingsReqSchema.parse(input);
      expect(result.query).toBe("weekly standup");
      expect(result.teams).toEqual(["engineering"]);
    });

    it("rejects empty query string", () => {
      expect(() =>
        searchMeetingsReqSchema.parse({
          query: "",
        }),
      ).toThrow();
    });

    it("accepts max_pages", () => {
      const result = searchMeetingsReqSchema.parse({ query: "test", max_pages: 10 });
      expect(result.max_pages).toBe(10);
    });

    it("rejects max_pages of 0", () => {
      expect(() => searchMeetingsReqSchema.parse({ query: "test", max_pages: 0 })).toThrow();
    });
  });

  describe("recordingReqSchema", () => {
    it("requires recording_id", () => {
      expect(() => recordingReqSchema.parse({})).toThrow();
    });

    it("accepts valid recording_id", () => {
      const result = recordingReqSchema.parse({ recording_id: 123 });
      expect(result.recording_id).toBe(123);
    });

    it("rejects invalid recording_id", () => {
      expect(() => recordingReqSchema.parse({ recording_id: 0 })).toThrow();
    });
  });

  describe("getTranscriptReqSchema", () => {
    it("requires recording_id", () => {
      expect(() => getTranscriptReqSchema.parse({})).toThrow();
    });

    it("accepts valid recording_id", () => {
      const result = getTranscriptReqSchema.parse({ recording_id: 123 });
      expect(result.recording_id).toBe(123);
    });

    it("rejects recording_id of 0", () => {
      expect(() => getTranscriptReqSchema.parse({ recording_id: 0 })).toThrow();
    });

    it("accepts optional speaker filter", () => {
      const result = getTranscriptReqSchema.parse({ recording_id: 123, speaker: "Alice" });
      expect(result.speaker).toBe("Alice");
    });
  });

  describe("getActionItemsReqSchema", () => {
    it("accepts empty object", () => {
      expect(() => getActionItemsReqSchema.parse({})).not.toThrow();
    });

    it("accepts date filters", () => {
      const result = getActionItemsReqSchema.parse({
        created_after: "2024-01-01T00:00:00Z",
        created_before: "2024-01-31T23:59:59Z",
      });
      expect(result.created_after).toBe("2024-01-01T00:00:00Z");
    });

    it("accepts completed filter", () => {
      const result = getActionItemsReqSchema.parse({ completed: false });
      expect(result.completed).toBe(false);
    });
  });

  describe("getMeetingContextReqSchema", () => {
    it("requires query", () => {
      expect(() => getMeetingContextReqSchema.parse({})).toThrow();
    });

    it("rejects empty query", () => {
      expect(() => getMeetingContextReqSchema.parse({ query: "" })).toThrow();
    });

    it("accepts valid query", () => {
      const result = getMeetingContextReqSchema.parse({ query: "jane" });
      expect(result.query).toBe("jane");
    });
  });

  describe("getWeeklyRecapReqSchema", () => {
    it("accepts empty object", () => {
      expect(() => getWeeklyRecapReqSchema.parse({})).not.toThrow();
    });

    it("accepts custom days", () => {
      const result = getWeeklyRecapReqSchema.parse({ days: 14 });
      expect(result.days).toBe(14);
    });

    it("rejects days of 0", () => {
      expect(() => getWeeklyRecapReqSchema.parse({ days: 0 })).toThrow();
    });
  });

  describe("listTeamsReqSchema", () => {    it("accepts empty object", () => {
      const result = listTeamsReqSchema.parse({});
      expect(result).toEqual({});
    });

    it("accepts cursor", () => {
      const result = listTeamsReqSchema.parse({ cursor: "page-2" });
      expect(result.cursor).toBe("page-2");
    });
  });

  describe("listTeamMembersReqSchema", () => {
    it("accepts empty object", () => {
      const result = listTeamMembersReqSchema.parse({});
      expect(result).toEqual({});
    });

    it("accepts team and cursor", () => {
      const result = listTeamMembersReqSchema.parse({
        team: "engineering",
        cursor: "page-3",
      });
      expect(result.team).toBe("engineering");
      expect(result.cursor).toBe("page-3");
    });
  });
});
