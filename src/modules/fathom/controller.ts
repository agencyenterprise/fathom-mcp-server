import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  listMeetingsInputSchema,
  listTeamMembersInputSchema,
  recordingInputSchema,
  searchMeetingsInputSchema,
} from "../claude/schema";
import { FathomService } from "./service";

export class FathomController {
  static async listMeetings(
    userId: string,
    args: unknown,
  ): Promise<CallToolResult> {
    try {
      const input = listMeetingsInputSchema.parse(args);
      const service = await FathomService.createAuthorizedService(userId);
      const data = await service.listMeetings(input);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }

  static async getTranscript(
    userId: string,
    args: unknown,
  ): Promise<CallToolResult> {
    try {
      const input = recordingInputSchema.parse(args);
      const service = await FathomService.createAuthorizedService(userId);
      const data = await service.getTranscript(input.recording_id);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }

  static async getSummary(
    userId: string,
    args: unknown,
  ): Promise<CallToolResult> {
    try {
      const input = recordingInputSchema.parse(args);
      const service = await FathomService.createAuthorizedService(userId);
      const data = await service.getSummary(input.recording_id);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }

  static async listTeams(userId: string): Promise<CallToolResult> {
    try {
      const service = await FathomService.createAuthorizedService(userId);
      const data = await service.listTeams();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }

  static async listTeamMembers(
    userId: string,
    args: unknown,
  ): Promise<CallToolResult> {
    try {
      const input = listTeamMembersInputSchema.parse(args);
      const service = await FathomService.createAuthorizedService(userId);
      const data = await service.listTeamMembers(input.team_name);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }

  static async searchMeetings(
    userId: string,
    args: unknown,
  ): Promise<CallToolResult> {
    try {
      const input = searchMeetingsInputSchema.parse(args);
      const service = await FathomService.createAuthorizedService(userId);
      const meetings = await service.listMeetings({ limit: input.limit ?? 50 });

      const query = input.query.toLowerCase();
      const filtered = meetings.items.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.meeting_title?.toLowerCase().includes(query),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { items: filtered.slice(0, input.limit ?? 10) },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }
}
