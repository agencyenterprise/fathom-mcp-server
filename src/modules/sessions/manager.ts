import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { logger } from "../../middleware/logger";
import {
  IDLE_TRANSPORT_REAP_INTERVAL_MS,
  IDLE_TRANSPORT_TTL_MS,
  MAX_ACTIVE_TRANSPORTS_WARN,
  SESSION_CLEANUP_INTERVAL_MS,
} from "../../shared/constants";
import { AppError } from "../../shared/errors";
import { createToolServer } from "../../tools/server";
import { cleanupExpiredMcpServerOAuthData } from "../oauth/service";
import {
  deleteSessionsByIds,
  findExpiredSessionIds,
  insertSession,
  markSessionTerminated,
} from "./service";

interface ActiveTransport {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  userId: string;
  lastAccessedAt: Date;
}

export class SessionManager {
  private activeTransports: Map<string, ActiveTransport>;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private reapIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.activeTransports = new Map();
  }

  async createSession(userId: string): Promise<StreamableHTTPServerTransport> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: async (sessionId) => {
        try {
          await insertSession(sessionId, userId);
          this.cacheTransport(sessionId, userId, transport, server);
        } catch (error) {
          logger.error(
            { sessionId, userId, error },
            "Session initialization failed, closing transport",
          );
          try {
            await transport.close();
          } catch (closeError) {
            logger.error(
              { sessionId, closeError },
              "Failed to close transport after initialization failure",
            );
          }
          throw error;
        }
      },
    });

    transport.onclose = async () => {
      const sessionId = transport.sessionId;
      if (sessionId) {
        await this.handleTransportClosed(sessionId);
      }
    };

    const server = createToolServer((sessionId) =>
      this.getActiveTransport(sessionId),
    );
    await server.connect(transport);

    return transport;
  }

  private cacheTransport(
    sessionId: string,
    userId: string,
    transport: StreamableHTTPServerTransport,
    server: McpServer,
  ): void {
    this.activeTransports.set(sessionId, {
      transport,
      server,
      userId,
      lastAccessedAt: new Date(),
    });

    const activeCount = this.activeTransports.size;

    if (activeCount > MAX_ACTIVE_TRANSPORTS_WARN) {
      logger.warn(
        {
          sessionId,
          userId,
          activeCount,
          threshold: MAX_ACTIVE_TRANSPORTS_WARN,
        },
        "Active transport count exceeds warning threshold",
      );
    }

    logger.info(
      { sessionId, userId, activeCount },
      "Transport stored in memory",
    );
  }

  async retrieveSession(sessionId: string): Promise<ActiveTransport | null> {
    const cachedTransport = this.activeTransports.get(sessionId);

    if (cachedTransport) {
      cachedTransport.lastAccessedAt = new Date();
      return cachedTransport;
    }

    return null;
  }

  async terminateSession(sessionId: string): Promise<void> {
    const cachedTransport = this.activeTransports.get(sessionId);

    if (cachedTransport) {
      try {
        await cachedTransport.server.close();
      } catch (error) {
        logger.error({ sessionId, error }, "Error closing server");
      }
    }

    await this.persistTermination(sessionId);
    this.activeTransports.delete(sessionId);

    logger.info({ sessionId }, "Session terminated");
  }

  private async persistTermination(sessionId: string): Promise<void> {
    try {
      await markSessionTerminated(sessionId);
    } catch {
      throw AppError.server("Failed to terminate session");
    }
  }

  private async handleTransportClosed(sessionId: string): Promise<void> {
    logger.info({ sessionId }, "Transport closed event received");

    try {
      await this.persistTermination(sessionId);
    } catch {
      // Error already thrown as AppError.server, can't propagate from SDK callback
    }
    this.activeTransports.delete(sessionId);
  }

  async reapIdleTransports(): Promise<void> {
    const now = Date.now();
    const idleSessions: string[] = [];

    for (const [sessionId, entry] of this.activeTransports) {
      const idleMs = now - entry.lastAccessedAt.getTime();
      if (idleMs > IDLE_TRANSPORT_TTL_MS) {
        idleSessions.push(sessionId);
      }
    }

    if (idleSessions.length === 0) return;

    const closePromises = idleSessions.map(async (sessionId) => {
      const entry = this.activeTransports.get(sessionId);
      if (entry) {
        try {
          await entry.server.close();
        } catch (error) {
          logger.error({ sessionId, error }, "Error closing idle server");
        }
        this.activeTransports.delete(sessionId);
      }
      try {
        await markSessionTerminated(sessionId);
      } catch {
        // Best-effort DB update
      }
    });

    await Promise.all(closePromises);

    logger.info(
      { reaped: idleSessions.length, remaining: this.activeTransports.size },
      "Reaped idle transports",
    );
  }

  async cleanupExpiredData(): Promise<void> {
    try {
      const expiredSessionIds = await findExpiredSessionIds();

      if (expiredSessionIds.length > 0) {
        const closePromises = expiredSessionIds.map(async (sessionId) => {
          const cachedTransport = this.activeTransports.get(sessionId);
          if (cachedTransport) {
            try {
              await cachedTransport.server.close();
            } catch (error) {
              logger.error(
                { sessionId, error },
                "Error closing expired server",
              );
            }
            this.activeTransports.delete(sessionId);
          }
        });

        await Promise.all(closePromises);
        await deleteSessionsByIds(expiredSessionIds);

        logger.info(
          { count: expiredSessionIds.length },
          "Cleaned up expired sessions",
        );
      }

      const oauthCleanupResult = await cleanupExpiredMcpServerOAuthData();
      const totalOAuthCleaned =
        oauthCleanupResult.oauthStates +
        oauthCleanupResult.authorizationCodes +
        oauthCleanupResult.accessTokens;

      if (totalOAuthCleaned > 0) {
        logger.info(oauthCleanupResult, "Cleaned up expired OAuth data");
      }
    } catch (error) {
      logger.error({ error }, "Error during data cleanup");
    }
  }

  startCleanupScheduler(): void {
    if (this.cleanupIntervalId) {
      logger.warn("Cleanup scheduler already running");
      return;
    }

    this.cleanupIntervalId = setInterval(
      () => this.cleanupExpiredData(),
      SESSION_CLEANUP_INTERVAL_MS,
    );

    this.reapIntervalId = setInterval(
      () => this.reapIdleTransports(),
      IDLE_TRANSPORT_REAP_INTERVAL_MS,
    );

    logger.info(
      {
        cleanupIntervalMs: SESSION_CLEANUP_INTERVAL_MS,
        reapIntervalMs: IDLE_TRANSPORT_REAP_INTERVAL_MS,
        idleTtlMs: IDLE_TRANSPORT_TTL_MS,
      },
      "Data cleanup and idle reaper schedulers started",
    );
  }

  stopCleanupScheduler(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    if (this.reapIntervalId) {
      clearInterval(this.reapIntervalId);
      this.reapIntervalId = null;
    }
    logger.info("Cleanup and reaper schedulers stopped");
  }

  async shutdown(): Promise<void> {
    logger.info("Shutting down session manager");

    this.stopCleanupScheduler();

    const closePromises = Array.from(this.activeTransports.entries()).map(
      async ([sessionId, { server }]) => {
        try {
          await server.close();
          await this.persistTermination(sessionId);
        } catch (error) {
          logger.error(
            { sessionId, error },
            "Error closing server during shutdown",
          );
        }
      },
    );

    await Promise.all(closePromises);
    this.activeTransports.clear();

    logger.info("Session manager shutdown complete");
  }

  getActiveTransport(sessionId: string): ActiveTransport | undefined {
    return this.activeTransports.get(sessionId);
  }
}
