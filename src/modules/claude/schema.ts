import { z } from "zod";

export const listMeetingsInputSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
});
export type ListMeetingsInputType = z.infer<typeof listMeetingsInputSchema>;

export const searchMeetingsInputSchema = z.object({
  query: z.string(),
  limit: z.number().min(1).max(50).optional(),
});
export type SearchMeetingsInputType = z.infer<typeof searchMeetingsInputSchema>;

export const recordingInputSchema = z.object({
  recording_id: z.string(),
});
export type RecordingInputType = z.infer<typeof recordingInputSchema>;

export const listTeamMembersInputSchema = z.object({
  team_name: z.string().optional(),
});
export type ListTeamMembersInputType = z.infer<
  typeof listTeamMembersInputSchema
>;
