import { z } from "zod";

export const fathomTokenResSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});
export type FathomTokenResType = z.infer<typeof fathomTokenResSchema>;

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

export const listMeetingsResSchema = z.object({
  items: z.array(meetingSchema),
  limit: z.number().nullable(),
  next_cursor: z.string().nullable(),
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

export const teamSchema = z.object({
  name: z.string(),
  created_at: z.string(),
});
export type TeamType = z.infer<typeof teamSchema>;

export const listTeamsResSchema = z.object({
  items: z.array(teamSchema),
  limit: z.number(),
  next_cursor: z.string().nullable(),
});
export type ListTeamsResType = z.infer<typeof listTeamsResSchema>;

export const teamMemberSchema = z.object({
  name: z.string(),
  email: z.string(),
  created_at: z.string(),
});
export type TeamMemberType = z.infer<typeof teamMemberSchema>;

export const listTeamMembersResSchema = z.object({
  items: z.array(teamMemberSchema),
  limit: z.number(),
  next_cursor: z.string().nullable(),
});
export type ListTeamMembersResType = z.infer<typeof listTeamMembersResSchema>;
