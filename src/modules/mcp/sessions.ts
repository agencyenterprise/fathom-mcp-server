import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import {
  SESSION_CLEANUP_INTERVAL_MS,
  SESSION_TTL_MS,
} from "../../common/constants";
import { db, mcpSessions } from "../../db";
import { logger } from "../../middleware";
import { ToolServer } from "../../tools";

interface ActiveTransport {
  transport: StreamableHTTPServerTransport;
  userId: string;
  lastAccessedAt: Date;
}

export class SessionManager {
  private activeTransports: Map<string, ActiveTransport>;
  private toolServer: ToolServer;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.activeTransports = new Map();
    this.toolServer = new ToolServer((sessionId) =>
      this.getActiveTransport(sessionId),
    );
  }

  async createSession(userId: string): Promise<StreamableHTTPServerTransport> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: async (sessionId) => {
        await this.storeSessionInDatabase(sessionId, userId);
        this.storeTransportInMemory(sessionId, userId, transport);
      },
    });

    transport.onclose = async () => {
      const sessionId = transport.sessionId;
      if (sessionId) {
        await this.handleTransportClosed(sessionId);
      }
    };

    await this.connectTransportToToolServer(transport);

    return transport;
  }

  private async storeSessionInDatabase(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    try {
      await db.insert(mcpSessions).values({
        sessionId,
        userId,
        createdAt: now,
        lastAccessedAt: now,
        expiresAt,
        terminatedAt: null,
      });

      logger.info({ sessionId, userId }, "Session stored in database");
    } catch (error) {
      logger.error(
        { sessionId, userId, error },
        "Failed to store session in database",
      );
      throw error;
    }
  }

  private storeTransportInMemory(
    sessionId: string,
    userId: string,
    transport: StreamableHTTPServerTransport,
  ): void {
    this.activeTransports.set(sessionId, {
      transport,
      userId,
      lastAccessedAt: new Date(),
    });

    logger.info(
      { sessionId, userId, activeCount: this.activeTransports.size },
      "Transport stored in memory",
    );
  }

  private async connectTransportToToolServer(
    transport: StreamableHTTPServerTransport,
  ): Promise<void> {
    await this.toolServer.getServer().connect(transport);
  }

  async retrieveSession(sessionId: string): Promise<ActiveTransport | null> {
    const activeTransport = this.activeTransports.get(sessionId);

    if (activeTransport) {
      activeTransport.lastAccessedAt = new Date();
      return activeTransport;
    }

    const dbSession = await this.findSessionInDatabase(sessionId);

    if (!dbSession) {
      logger.debug({ sessionId }, "Session not found");
      return null;
    }

    if (dbSession.terminatedAt) {
      logger.debug({ sessionId }, "Session was terminated");
      return null;
    }

    if (dbSession.expiresAt < new Date()) {
      logger.debug({ sessionId }, "Session expired");
      return null;
    }

    logger.info(
      { sessionId },
      "Session exists in DB but transport lost (server restarted?). Client should re-initialize.",
    );
    return null;
  }

  private async findSessionInDatabase(sessionId: string) {
    const result = await db
      .select()
      .from(mcpSessions)
      .where(eq(mcpSessions.sessionId, sessionId))
      .limit(1);

    return result[0] ?? null;
  }

  async terminateSession(sessionId: string): Promise<void> {
    const activeTransport = this.activeTransports.get(sessionId);

    if (activeTransport) {
      try {
        await activeTransport.transport.close();
      } catch (error) {
        logger.error({ sessionId, error }, "Error closing transport");
      }
    }

    await this.markSessionAsTerminated(sessionId);
    this.activeTransports.delete(sessionId);

    logger.info({ sessionId }, "Session terminated");
  }

  private async markSessionAsTerminated(sessionId: string): Promise<void> {
    try {
      await db
        .update(mcpSessions)
        .set({ terminatedAt: new Date() })
        .where(eq(mcpSessions.sessionId, sessionId));
    } catch (error) {
      logger.error(
        { sessionId, error },
        "Failed to mark session as terminated",
      );
    }
  }

  private async handleTransportClosed(sessionId: string): Promise<void> {
    logger.info({ sessionId }, "Transport closed event received");

    await this.markSessionAsTerminated(sessionId);
    this.activeTransports.delete(sessionId);
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const staleTerminationCutoff = new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    );

    try {
      const sessionsToCleanup = await db
        .select()
        .from(mcpSessions)
        .where(
          or(
            lt(mcpSessions.expiresAt, now),
            and(
              isNotNull(mcpSessions.terminatedAt),
              lt(mcpSessions.terminatedAt, staleTerminationCutoff),
            ),
          ),
        );

      for (const session of sessionsToCleanup) {
        const activeTransport = this.activeTransports.get(session.sessionId);
        if (activeTransport) {
          try {
            await activeTransport.transport.close();
          } catch (error) {
            logger.error(
              { sessionId: session.sessionId, error },
              "Error closing orphaned transport",
            );
          }
          this.activeTransports.delete(session.sessionId);
        }
      }

      if (sessionsToCleanup.length > 0) {
        const deletedIds = sessionsToCleanup.map((s) => s.sessionId);
        await db
          .delete(mcpSessions)
          .where(
            or(
              lt(mcpSessions.expiresAt, now),
              and(
                isNotNull(mcpSessions.terminatedAt),
                lt(mcpSessions.terminatedAt, staleTerminationCutoff),
              ),
            ),
          );

        logger.info(
          { count: deletedIds.length, deletedIds },
          "Cleaned up expired/terminated sessions",
        );
      }
    } catch (error) {
      logger.error({ error }, "Error during session cleanup");
    }
  }

  startCleanupScheduler(): void {
    if (this.cleanupIntervalId) {
      logger.warn("Cleanup scheduler already running");
      return;
    }

    this.cleanupIntervalId = setInterval(
      () => this.cleanupExpiredSessions(),
      SESSION_CLEANUP_INTERVAL_MS,
    );

    logger.info(
      { intervalMs: SESSION_CLEANUP_INTERVAL_MS },
      "Session cleanup scheduler started",
    );
  }

  stopCleanupScheduler(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      logger.info("Session cleanup scheduler stopped");
    }
  }

  async shutdown(): Promise<void> {
    logger.info("Shutting down session manager");

    this.stopCleanupScheduler();

    const closePromises = Array.from(this.activeTransports.entries()).map(
      async ([sessionId, { transport }]) => {
        try {
          await transport.close();
          await this.markSessionAsTerminated(sessionId);
        } catch (error) {
          logger.error(
            { sessionId, error },
            "Error closing transport during shutdown",
          );
        }
      },
    );

    await Promise.all(closePromises);
    this.activeTransports.clear();

    await this.toolServer.close();

    logger.info("Session manager shutdown complete");
  }

  getActiveTransport(sessionId: string): ActiveTransport | undefined {
    return this.activeTransports.get(sessionId);
  }
}
