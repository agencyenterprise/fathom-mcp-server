import { z } from "zod";

const speakerSchema = z.object({
  display_name: z.string(),
  matched_calendar_invitee_email: z.string().email().nullable().optional(),
});

const transcriptEntrySchema = z.object({
  speaker: speakerSchema,
  text: z.string(),
  timestamp: z.string(),
});

const summarySchema = z.object({
  template_name: z.string().nullable(),
  markdown_formatted: z.string().nullable(),
});

const assigneeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  team: z.string().nullable(),
});

const contactSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  record_url: z.string().url(),
});

const dealSchema = z.object({
  name: z.string(),
  amount: z.number(),
  record_url: z.string().url(),
});

const companySchema = z.object({
  name: z.string(),
  record_url: z.string().url(),
});

const actionItemSchema = z.object({
  description: z.string(),
  user_generated: z.boolean(),
  completed: z.boolean(),
  recording_timestamp: z.string(),
  recording_playback_url: z.string(),
  assignee: assigneeSchema,
});

const calendarInviteeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  email_domain: z.string().nullable(),
  is_external: z.boolean(),
  matched_speaker_display_name: z.string().nullable().optional(),
});

const recordedBySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  email_domain: z.string(),
  team: z.string().nullable(),
});

const crmMatchesSchema = z.object({
  contacts: z.array(contactSchema).optional(),
  companies: z.array(companySchema).optional(),
  deals: z.array(dealSchema).optional(),
  error: z.string().nullable().optional(),
});

const meetingSchema = z.object({
  title: z.string(),
  meeting_title: z.string().nullable(),
  recording_id: z.number(),
  url: z.string(),
  share_url: z.string(),
  created_at: z.string(),
  scheduled_start_time: z.string(),
  scheduled_end_time: z.string(),
  recording_start_time: z.string(),
  recording_end_time: z.string(),
  calendar_invitees_domains_type: z.enum([
    "only_internal",
    "one_or_more_external",
  ]),
  transcript_language: z.string(),
  calendar_invitees: z.array(calendarInviteeSchema),
  recorded_by: recordedBySchema,
  transcript: z.array(transcriptEntrySchema).nullable().optional(),
  default_summary: summarySchema.nullable().optional(),
  action_items: z.array(actionItemSchema).nullable().optional(),
  crm_matches: crmMatchesSchema.nullable().optional(),
});

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

export const listMeetingsResSchema = z.object({
  limit: z.number().nullable(),
  next_cursor: z.string().nullable(),
  items: z.array(meetingSchema),
});
export type ListMeetingsResType = z.infer<typeof listMeetingsResSchema>;

export const transcriptResSchema = z.object({
  transcript: z.array(transcriptEntrySchema),
});
export type TranscriptResType = z.infer<typeof transcriptResSchema>;

export const summaryResSchema = z.object({
  summary: summarySchema,
});
export type SummaryResType = z.infer<typeof summaryResSchema>;

const teamSchema = z.object({
  name: z.string(),
  created_at: z.string(),
});

const teamMemberSchema = z.object({
  name: z.string(),
  email: z.string(),
  created_at: z.string(),
});

export const listTeamsResSchema = z.object({
  items: z.array(teamSchema),
  limit: z.number(),
  next_cursor: z.string().nullable(),
});
export type ListTeamsResType = z.infer<typeof listTeamsResSchema>;

export const listTeamMembersResSchema = z.object({
  items: z.array(teamMemberSchema),
  limit: z.number(),
  next_cursor: z.string().nullable(),
});
export type ListTeamMembersResType = z.infer<typeof listTeamMembersResSchema>;
