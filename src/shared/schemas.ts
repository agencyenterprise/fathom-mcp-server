import { z } from "zod";

export const listMeetingsReqSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  calendar_invitees_domains: z.array(z.string()).optional(),
  calendar_invitees_domains_type: z
    .enum(["all", "only_internal", "one_or_more_external"])
    .optional(),
  teams: z.array(z.string()).optional(),
  recorded_by: z.array(z.string().email()).optional(),
  include_action_items: z.boolean().optional(),
});
export type ListMeetingsReqType = z.infer<typeof listMeetingsReqSchema>;

export const searchMeetingsReqSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(100).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  calendar_invitees_domains: z.array(z.string()).optional(),
  calendar_invitees_domains_type: z
    .enum(["all", "only_internal", "one_or_more_external"])
    .optional(),
  teams: z.array(z.string()).optional(),
  recorded_by: z.array(z.string().email()).optional(),
});
export type SearchMeetingsReqType = z.infer<typeof searchMeetingsReqSchema>;

export const recordingReqSchema = z.object({
  recording_id: z.string().min(1),
});
export type RecordingReqType = z.infer<typeof recordingReqSchema>;

export const listTeamsReqSchema = z.object({
  cursor: z.string().optional(),
});
export type ListTeamsReqType = z.infer<typeof listTeamsReqSchema>;

export const listTeamMembersReqSchema = z.object({
  team_name: z.string().optional(),
  cursor: z.string().optional(),
});
export type ListTeamMembersReqType = z.infer<typeof listTeamMembersReqSchema>;
