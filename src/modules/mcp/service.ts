import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { ClaudeTools } from "../claude";

const claudeTools = new ClaudeTools();
const transports = new Map<
  string,
  { transport: StreamableHTTPServerTransport; userId: string }
>();

export class McpService {
  static createTransport(userId: string): StreamableHTTPServerTransport {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (sessionId) => {
        transports.set(sessionId, { transport, userId });
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) transports.delete(sid);
    };

    return transport;
  }

  static getTransport(sessionId: string) {
    return transports.get(sessionId) ?? null;
  }

  static async connectTransport(transport: StreamableHTTPServerTransport) {
    await claudeTools.getServer().connect(transport);
  }
}
