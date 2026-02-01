import { z } from "zod";

export const sessionsReqSchema = z.object({
  userId: z.string(),
  sessionId: z.string().optional(),
});
