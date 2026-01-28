import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  listMeetingsInputSchema,
  listTeamMembersInputSchema,
  recordingInputSchema,
  searchMeetingsInputSchema,
} from "../claude/schema";
import { FathomService } from "./service";

function toolResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function toolError(error: unknown): CallToolResult {
  console.error("Tool error:", error);
  return {
    content: [{ type: "text", text: (error as Error).message }],
    isError: true,
  };
}

type ToolHandler<T> = (args: T) => Promise<unknown>;

function withToolHandler<T>(
  schema: { parse: (args: unknown) => T },
  handler: ToolHandler<T>,
) {
  return async (userId: string, args: unknown): Promise<CallToolResult> => {
    try {
      const input = schema.parse(args);
      const service = await FathomService.createAuthorizedService(userId);
      const data = await handler.call(service, input);
      return toolResult(data);
    } catch (error) {
      return toolError(error);
    }
  };
}

export class FathomController {
  static listMeetings = withToolHandler(
    listMeetingsInputSchema,
    async function (this: FathomService, input) {
      return this.listMeetings(input);
    },
  );

  static getTranscript = withToolHandler(
    recordingInputSchema,
    async function (this: FathomService, input) {
      return this.getTranscript(input.recording_id);
    },
  );

  static getSummary = withToolHandler(
    recordingInputSchema,
    async function (this: FathomService, input) {
      return this.getSummary(input.recording_id);
    },
  );

  static listTeamMembers = withToolHandler(
    listTeamMembersInputSchema,
    async function (this: FathomService, input) {
      return this.listTeamMembers(input.team_id);
    },
  );

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

      return toolResult({ items: filtered.slice(0, input.limit ?? 10) });
    } catch (error) {
      return toolError(error);
    }
  }

  static async listTeams(userId: string): Promise<CallToolResult> {
    try {
      const service = await FathomService.createAuthorizedService(userId);
      const data = await service.listTeams();
      return toolResult(data);
    } catch (error) {
      return toolError(error);
    }
  }
}
