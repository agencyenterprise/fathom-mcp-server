import { z } from "zod";

// Tool Input Schemas
export const listMeetingsInputSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of meetings to return (1-100, default 10)"),
  created_after: z
    .string()
    .optional()
    .describe("ISO date string - only return meetings after this date"),
  created_before: z
    .string()
    .optional()
    .describe("ISO date string - only return meetings before this date"),
});
export type ListMeetingsInputType = z.infer<typeof listMeetingsInputSchema>;

export const searchMeetingsInputSchema = z.object({
  query: z.string().describe("Search term to find in meeting titles"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe("Max results to return (default 10)"),
});
export type SearchMeetingsInputType = z.infer<typeof searchMeetingsInputSchema>;

export const getTranscriptInputSchema = z.object({
  recording_id: z.string().describe("The recording ID from a meeting"),
});
export type GetTranscriptInputType = z.infer<typeof getTranscriptInputSchema>;

export const getSummaryInputSchema = z.object({
  recording_id: z.string().describe("The recording ID from a meeting"),
});
export type GetSummaryInputType = z.infer<typeof getSummaryInputSchema>;

export const getActionItemsInputSchema = z.object({
  recording_id: z.string().describe("The recording ID from a meeting"),
});
export type GetActionItemsInputType = z.infer<typeof getActionItemsInputSchema>;

export const listTeamMembersInputSchema = z.object({
  team_id: z.string().describe("The team ID to list members for"),
});
export type ListTeamMembersInputType = z.infer<
  typeof listTeamMembersInputSchema
>;
