import { z } from "zod";
import { listMeetingsReqSchema } from "../modules/fathom/schema";

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
