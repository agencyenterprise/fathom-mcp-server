import { z } from "zod";
export const listMeetingsReqSchema = z.object({
  calendar_invitees_domains: z.array(z.string()).optional(),
  calendar_invitees_domains_type: z
    .enum(["all", "only_internal", "one_or_more_external"])
    .optional(),
  created_after: z.iso.datetime().optional(),
  created_before: z.iso.datetime().optional(),
  cursor: z.string().optional(),
  include_action_items: z.boolean().optional(),
  include_crm_matches: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  recorded_by: z.array(z.email()).optional(),
  teams: z.array(z.string()).optional(),
});
export type ListMeetingsReqType = z.infer<typeof listMeetingsReqSchema>;

export const searchMeetingsReqSchema = z.object({
  query: z.string().min(1),
  max_pages: z.number().int().positive().optional(),
  ...listMeetingsReqSchema.shape,
});

export const recordingReqSchema = z.object({
  recording_id: z.number().int().positive(),
});

export const getTranscriptReqSchema = z.object({
  recording_id: z.number().int().positive(),
  speaker: z.string().optional(),
});

export const listTeamsReqSchema = z.object({
  cursor: z.string().optional(),
});

export const listTeamMembersReqSchema = z.object({
  team: z.string().optional(),
  cursor: z.string().optional(),
});

const meetingDateFiltersSchema = z.object({
  created_after: z.iso.datetime().optional(),
  created_before: z.iso.datetime().optional(),
});

export const getActionItemsReqSchema = meetingDateFiltersSchema.extend({
  completed: z.boolean().optional(),
});

export const getMeetingContextReqSchema = z.object({
  query: z.string().min(1),
  created_after: z.iso.datetime().optional(),
  created_before: z.iso.datetime().optional(),
});

export const getWeeklyRecapReqSchema = z.object({
  days: z.number().int().positive().optional(),
});
