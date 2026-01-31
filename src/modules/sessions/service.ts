import { and, eq, inArray, isNotNull, lt, or } from "drizzle-orm";
import { db, mcpSessions } from "../../db";
import {
  SESSION_TTL_MS,
  STALE_TERMINATION_CUTOFF_MS,
} from "../../shared/constants";

export async function insertSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.insert(mcpSessions).values({
    sessionId,
    userId,
    createdAt: now,
    expiresAt,
    terminatedAt: null,
  });
}

export async function markSessionTerminated(sessionId: string): Promise<void> {
  await db
    .update(mcpSessions)
    .set({ terminatedAt: new Date() })
    .where(eq(mcpSessions.sessionId, sessionId));
}

export async function findExpiredSessionIds(): Promise<string[]> {
  const now = new Date();
  const staleTerminationCutoff = new Date(
    now.getTime() - STALE_TERMINATION_CUTOFF_MS,
  );

  const expiredCondition = or(
    lt(mcpSessions.expiresAt, now),
    and(
      isNotNull(mcpSessions.terminatedAt),
      lt(mcpSessions.terminatedAt, staleTerminationCutoff),
    ),
  );

  const sessions = await db
    .select({ sessionId: mcpSessions.sessionId })
    .from(mcpSessions)
    .where(expiredCondition);

  return sessions.map((s) => s.sessionId);
}

export async function deleteSessionsByIds(sessionIds: string[]): Promise<void> {
  if (sessionIds.length === 0) return;

  await db
    .delete(mcpSessions)
    .where(inArray(mcpSessions.sessionId, sessionIds));
}
