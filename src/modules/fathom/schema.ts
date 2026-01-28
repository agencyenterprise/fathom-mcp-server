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
  matched_calendar_invitee_email: z.string().optional(),
});
export type SpeakerType = z.infer<typeof speakerSchema>;

export const transcriptEntrySchema = z.object({
  speaker: speakerSchema,
  text: z.string(),
  timestamp: z.string(),
});
export type TranscriptEntryType = z.infer<typeof transcriptEntrySchema>;

export const summarySchema = z.object({
  template_name: z.string(),
  markdown_formatted: z.string(),
});
export type SummaryType = z.infer<typeof summarySchema>;

export const actionItemSchema = z.object({
  description: z.string(),
  user_generated: z.boolean().optional(),
  completed: z.boolean(),
  recording_timestamp: z.string().optional(),
  recording_playback_url: z.string().optional(),
  assignee: z
    .object({
      name: z.string(),
      email: z.string(),
      team: z.string().optional(),
    })
    .optional(),
});
export type ActionItemType = z.infer<typeof actionItemSchema>;

export const calendarInviteeSchema = z.object({
  is_external: z.boolean(),
  name: z.string(),
  email: z.string(),
});
export type CalendarInviteeType = z.infer<typeof calendarInviteeSchema>;

export const recordedBySchema = z.object({
  name: z.string(),
  email: z.string(),
  team: z.string().optional(),
});
export type RecordedByType = z.infer<typeof recordedBySchema>;

export const meetingSchema = z.object({
  title: z.string(),
  meeting_title: z.string().optional(),
  url: z.string(),
  share_url: z.string(),
  created_at: z.string(),
  scheduled_start_time: z.string().optional(),
  scheduled_end_time: z.string().optional(),
  recording_start_time: z.string().optional(),
  recording_end_time: z.string().optional(),
  meeting_type: z.string().optional(),
  transcript_language: z.string().optional(),
  calendar_invitees: z.array(calendarInviteeSchema).optional(),
  recorded_by: recordedBySchema.optional(),
  transcript: z.array(transcriptEntrySchema).optional(),
  default_summary: summarySchema.optional(),
  action_items: z.array(actionItemSchema).optional(),
});
export type MeetingType = z.infer<typeof meetingSchema>;

export const listMeetingsResponseSchema = z.object({
  items: z.array(meetingSchema),
  limit: z.number(),
  next_cursor: z.string().optional(),
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
  id: z.string(),
  name: z.string(),
});
export type TeamType = z.infer<typeof teamSchema>;

export const listTeamsResponseSchema = z.object({
  items: z.array(teamSchema),
});
export type ListTeamsResponseType = z.infer<typeof listTeamsResponseSchema>;

export const teamMemberSchema = z.object({
  name: z.string(),
  email: z.string(),
  team: z.string().optional(),
});
export type TeamMemberType = z.infer<typeof teamMemberSchema>;

export const listTeamMembersResponseSchema = z.object({
  items: z.array(teamMemberSchema),
});
export type ListTeamMembersResponseType = z.infer<
  typeof listTeamMembersResponseSchema
>;
