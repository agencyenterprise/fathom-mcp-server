import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import {
  SESSION_CLEANUP_INTERVAL_MS,
  SESSION_TTL_MS,
} from "../../common/constants";
import { ToolServer } from "../../tools";

interface SessionRecord {
  transport: StreamableHTTPServerTransport;
  userId: string;
  createdAt: number;
}

const toolServer = new ToolServer();
const sessions = new Map<string, SessionRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    const sessionExpired = now - session.createdAt > SESSION_TTL_MS;
    if (sessionExpired) {
      sessions.delete(sessionId);
    }
  }
}, SESSION_CLEANUP_INTERVAL_MS);

export class McpService {
  static createTransport(userId: string): StreamableHTTPServerTransport {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (sessionId) => {
        sessions.set(sessionId, {
          transport,
          userId,
          createdAt: Date.now(),
        });
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) sessions.delete(sid);
    };

    return transport;
  }

  static getTransport(sessionId: string) {
    return sessions.get(sessionId) ?? null;
  }

  static async connectTransport(transport: StreamableHTTPServerTransport) {
    await toolServer.getServer().connect(transport);
  }
}
