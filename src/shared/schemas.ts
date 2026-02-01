import { z } from "zod";
export const listMeetingsReqSchema = z.object({
  calendar_invitees_domains: z.array(z.string()).optional(),
  calendar_invitees_domains_type: z
    .enum(["all", "only_internal", "one_or_more_external"])
    .optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  cursor: z.string().optional(),
  include_action_items: z.boolean().optional(),
  include_crm_matches: z.boolean().optional(),
  recorded_by: z.array(z.string().email()).optional(),
  teams: z.array(z.string()).optional(),
});
export type ListMeetingsReqType = z.infer<typeof listMeetingsReqSchema>;

export const searchMeetingsReqSchema = z.object({
  query: z.string().min(1),
  ...listMeetingsReqSchema.shape,
});

export const recordingReqSchema = z.object({
  recording_id: z.string().min(1),
});

export const listTeamsReqSchema = z.object({
  cursor: z.string().optional(),
});

export const listTeamMembersReqSchema = z.object({
  team: z.string().optional(),
  cursor: z.string().optional(),
});
