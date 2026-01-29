import { z } from "zod";

export const fathomTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});
export type FathomTokenResponseType = z.infer<typeof fathomTokenResponseSchema>;

export const speakerSchema = z.object({
  display_name: z.string(),
  matched_calendar_invitee_email: z.string().nullable().optional(),
});
export type SpeakerType = z.infer<typeof speakerSchema>;

export const transcriptEntrySchema = z.object({
  speaker: speakerSchema,
  text: z.string(),
  timestamp: z.string(),
});
export type TranscriptEntryType = z.infer<typeof transcriptEntrySchema>;

export const summarySchema = z.object({
  template_name: z.string().nullable(),
  markdown_formatted: z.string().nullable(),
});
export type SummaryType = z.infer<typeof summarySchema>;

export const assigneeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  team: z.string().nullable(),
});
export type AssigneeType = z.infer<typeof assigneeSchema>;

export const actionItemSchema = z.object({
  description: z.string(),
  user_generated: z.boolean(),
  completed: z.boolean(),
  recording_timestamp: z.string(),
  recording_playback_url: z.string(),
  assignee: assigneeSchema,
});
export type ActionItemType = z.infer<typeof actionItemSchema>;

export const calendarInviteeSchema = z.object({
  name: z.string().nullable(),
  matched_speaker_display_name: z.string().nullable().optional(),
  email: z.string().nullable(),
  email_domain: z.string().nullable(),
  is_external: z.boolean(),
});
export type CalendarInviteeType = z.infer<typeof calendarInviteeSchema>;

export const recordedBySchema = z.object({
  name: z.string(),
  email: z.string(),
  email_domain: z.string(),
  team: z.string().nullable(),
});
export type RecordedByType = z.infer<typeof recordedBySchema>;

export const meetingSchema = z.object({
  title: z.string(),
  meeting_title: z.string().nullable(),
  recording_id: z.number(),
  url: z.string(),
  share_url: z.string(),
  created_at: z.string(),
  scheduled_start_time: z.string().nullable(),
  scheduled_end_time: z.string().nullable(),
  recording_start_time: z.string().nullable(),
  recording_end_time: z.string().nullable(),
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
});
export type MeetingType = z.infer<typeof meetingSchema>;

export const listMeetingsResponseSchema = z.object({
  items: z.array(meetingSchema),
  limit: z.number().nullable(),
  next_cursor: z.string().nullable(),
});
export type ListMeetingsResponseType = z.infer<
  typeof listMeetingsResponseSchema
>;

export const listMeetingsParamsSchema = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  recorded_by: z.array(z.string()).optional(),
  include_transcript: z.boolean().optional(),
  include_summary: z.boolean().optional(),
});
export type ListMeetingsParamsType = z.infer<typeof listMeetingsParamsSchema>;

export const transcriptResponseSchema = z.object({
  transcript: z.array(transcriptEntrySchema),
});
export type TranscriptResponseType = z.infer<typeof transcriptResponseSchema>;

export const summaryResponseSchema = z.object({
  summary: summarySchema,
});
export type SummaryResponseType = z.infer<typeof summaryResponseSchema>;

export const teamSchema = z.object({
  name: z.string(),
  created_at: z.string(),
});
export type TeamType = z.infer<typeof teamSchema>;

export const listTeamsResponseSchema = z.object({
  items: z.array(teamSchema),
  limit: z.number(),
  next_cursor: z.string().nullable(),
});
export type ListTeamsResponseType = z.infer<typeof listTeamsResponseSchema>;

export const teamMemberSchema = z.object({
  name: z.string(),
  email: z.string(),
  created_at: z.string(),
});
export type TeamMemberType = z.infer<typeof teamMemberSchema>;

export const listTeamMembersResponseSchema = z.object({
  items: z.array(teamMemberSchema),
  limit: z.number(),
  next_cursor: z.string().nullable(),
});
export type ListTeamMembersResponseType = z.infer<
  typeof listTeamMembersResponseSchema
>;
