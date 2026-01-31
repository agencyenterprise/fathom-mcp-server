import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { logger } from "../../middleware/logger";
import { SESSION_CLEANUP_INTERVAL_MS } from "../../shared/constants";
import { ErrorLogger } from "../../shared/errors";
import { ToolServer } from "../../tools/server";
import { cleanupExpiredMcpServerOAuthData } from "../oauth/service";
import {
  deleteSessionsByIds,
  findExpiredSessionIds,
  insertSession,
  markSessionTerminated,
} from "./service";

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
        try {
          await insertSession(sessionId, userId);
          this.cacheTransport(sessionId, userId, transport);
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

    await this.toolServer.getServer().connect(transport);

    return transport;
  }

  private cacheTransport(
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
        await cachedTransport.transport.close();
      } catch (error) {
        logger.error({ sessionId, error }, "Error closing transport");
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
      throw ErrorLogger.server("Failed to terminate session");
    }
  }

  private async handleTransportClosed(sessionId: string): Promise<void> {
    logger.info({ sessionId }, "Transport closed event received");

    try {
      await this.persistTermination(sessionId);
    } catch {
      // Error already thrown as ErrorLogger.server, can't propagate from SDK callback
    }
    this.activeTransports.delete(sessionId);
  }

  async cleanupExpiredData(): Promise<void> {
    try {
      const expiredSessionIds = await findExpiredSessionIds();

      if (expiredSessionIds.length > 0) {
        const closePromises = expiredSessionIds.map(async (sessionId) => {
          const cachedTransport = this.activeTransports.get(sessionId);
          if (cachedTransport) {
            try {
              await cachedTransport.transport.close();
            } catch (error) {
              logger.error(
                { sessionId, error },
                "Error closing expired transport",
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

    logger.info(
      { intervalMs: SESSION_CLEANUP_INTERVAL_MS },
      "Data cleanup scheduler started",
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
          await this.persistTermination(sessionId);
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
