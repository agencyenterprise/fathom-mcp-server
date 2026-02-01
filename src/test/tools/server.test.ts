import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

const mockRegisterTool = vi.fn();
const mockConnect = vi.fn();
const mockClose = vi.fn();

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    registerTool = mockRegisterTool;
    connect = mockConnect;
    close = mockClose;
  },
}));

vi.mock("../../tools/handlers", () => ({
  listMeetings: vi.fn().mockResolvedValue({ content: [] }),
  searchMeetings: vi.fn().mockResolvedValue({ content: [] }),
  getTranscript: vi.fn().mockResolvedValue({ content: [] }),
  getSummary: vi.fn().mockResolvedValue({ content: [] }),
  listTeams: vi.fn().mockResolvedValue({ content: [] }),
  listTeamMembers: vi.fn().mockResolvedValue({ content: [] }),
}));

import {
  getSummary,
  getTranscript,
  listMeetings,
  listTeamMembers,
  listTeams,
  searchMeetings,
} from "../../tools/handlers";
import { ToolServer } from "../../tools/server";

type GetActiveTransportFn = (
  sessionId: string,
) => { userId: string } | undefined;

describe("ToolServer", () => {
  let getActiveTransportFn: Mock<GetActiveTransportFn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterTool.mockClear();
    mockConnect.mockClear();
    mockClose.mockClear();
    getActiveTransportFn = vi.fn<GetActiveTransportFn>();
  });

  describe("constructor", () => {
    it("creates server and registers tools", () => {
      const server = new ToolServer(getActiveTransportFn);

      expect(server).toBeDefined();
      expect(server.getServer()).toBeDefined();
    });
  });

  describe("getServer", () => {
    it("returns the MCP server instance", () => {
      const server = new ToolServer(getActiveTransportFn);
      const mcpServer = server.getServer();

      expect(mcpServer).toBeDefined();
      expect(mcpServer.registerTool).toBeDefined();
    });
  });

  describe("close", () => {
    it("closes the server", async () => {
      const server = new ToolServer(getActiveTransportFn);
      const mcpServer = server.getServer();

      await server.close();

      expect(mcpServer.close).toHaveBeenCalled();
    });
  });

  describe("getUserId", () => {
    it("throws when sessionId is missing", async () => {
      new ToolServer(getActiveTransportFn);

      const registeredTools = mockRegisterTool.mock.calls;
      expect(registeredTools.length).toBeGreaterThan(0);

      const [, , handler] = registeredTools[0];
      const mockExtra = { sessionId: undefined };

      await expect(handler({}, mockExtra)).rejects.toThrow();
    });

    it("throws when session not found", async () => {
      getActiveTransportFn.mockReturnValue(undefined);

      new ToolServer(getActiveTransportFn);

      const registeredTools = mockRegisterTool.mock.calls;
      const [, , handler] = registeredTools[0];
      const mockExtra = { sessionId: "session-123" };

      await expect(handler({}, mockExtra)).rejects.toThrow();
    });

    it("returns userId when session exists", async () => {
      getActiveTransportFn.mockReturnValue({ userId: "user-456" });

      new ToolServer(getActiveTransportFn);

      const registeredTools = mockRegisterTool.mock.calls;
      expect(registeredTools.length).toBe(6);
    });
  });

  describe("tool registration", () => {
    it("registers all 6 tools", () => {
      new ToolServer(getActiveTransportFn);

      const registeredTools = mockRegisterTool.mock.calls;
      const toolNames = registeredTools.map(([name]) => name);

      expect(toolNames).toContain("list_meetings");
      expect(toolNames).toContain("search_meetings");
      expect(toolNames).toContain("get_transcript");
      expect(toolNames).toContain("get_summary");
      expect(toolNames).toContain("list_teams");
      expect(toolNames).toContain("list_team_members");
      expect(toolNames).toHaveLength(6);
    });

    it("registers tools with descriptions", () => {
      new ToolServer(getActiveTransportFn);

      const registeredTools = mockRegisterTool.mock.calls;

      for (const [, config] of registeredTools) {
        expect(config.title).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.inputSchema).toBeDefined();
      }
    });
  });

  describe("tool handlers", () => {
    function getToolHandler(toolName: string) {
      new ToolServer(getActiveTransportFn);
      const registeredTools = mockRegisterTool.mock.calls;
      const tool = registeredTools.find(([name]) => name === toolName);
      return tool?.[2];
    }

    beforeEach(() => {
      getActiveTransportFn.mockReturnValue({ userId: "user-123" });
    });

    it("list_meetings calls handler with userId", async () => {
      const handler = getToolHandler("list_meetings");
      const mockExtra = { sessionId: "session-123" };
      const args = { limit: 10 };

      await handler(args, mockExtra);

      expect(listMeetings).toHaveBeenCalledWith("user-123", args);
    });

    it("search_meetings calls handler with userId", async () => {
      const handler = getToolHandler("search_meetings");
      const mockExtra = { sessionId: "session-123" };
      const args = { query: "test" };

      await handler(args, mockExtra);

      expect(searchMeetings).toHaveBeenCalledWith("user-123", args);
    });

    it("get_transcript calls handler with userId", async () => {
      const handler = getToolHandler("get_transcript");
      const mockExtra = { sessionId: "session-123" };
      const args = { recording_id: 123 };

      await handler(args, mockExtra);

      expect(getTranscript).toHaveBeenCalledWith("user-123", args);
    });

    it("get_summary calls handler with userId", async () => {
      const handler = getToolHandler("get_summary");
      const mockExtra = { sessionId: "session-123" };
      const args = { recording_id: 123 };

      await handler(args, mockExtra);

      expect(getSummary).toHaveBeenCalledWith("user-123", args);
    });

    it("list_teams calls handler with userId", async () => {
      const handler = getToolHandler("list_teams");
      const mockExtra = { sessionId: "session-123" };
      const args = {};

      await handler(args, mockExtra);

      expect(listTeams).toHaveBeenCalledWith("user-123", args);
    });

    it("list_team_members calls handler with userId", async () => {
      const handler = getToolHandler("list_team_members");
      const mockExtra = { sessionId: "session-123" };
      const args = { team: "Engineering" };

      await handler(args, mockExtra);

      expect(listTeamMembers).toHaveBeenCalledWith("user-123", args);
    });
  });
});
