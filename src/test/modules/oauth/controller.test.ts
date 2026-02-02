import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FathomOAuthToken,
  McpServerAuthorizationCode,
  McpServerOAuthClient,
  McpServerOAuthState,
} from "../../../db/schema";

vi.mock("../../../modules/oauth/service");

vi.mock("../../../utils/crypto", () => ({
  decrypt: vi.fn((val: string) => `decrypted-${val}`),
  encrypt: vi.fn((val: string) => `encrypted-${val}`),
}));

vi.mock("../../../db", () => ({
  db: {},
}));

import {
  authorizeClientAndRedirectToFathom,
  buildFathomOAuthAuthorizationUrl,
  completeFathomAuthAndRedirectClient,
  exchangeCodeForFathomToken,
  exchangeCodeForMcpAccessToken,
  fetchFathomOAuthToken,
  refreshFathomToken,
  registerMcpServerOAuthClient,
} from "../../../modules/oauth/controller";
import {
  consumeMcpServerAuthorizationCode,
  createMcpServerAccessToken,
  createMcpServerAuthorizationCode,
  createMcpServerOAuthState,
  deleteMcpServerOAuthState,
  findMcpServerOAuthClient,
  getFathomOAuthToken,
  getMcpServerOAuthState,
  insertFathomToken,
  insertMcpServerOAuthClient,
  verifyMcpServerPKCE,
} from "../../../modules/oauth/service";

function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function createMockResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

type Request = Parameters<typeof registerMcpServerOAuthClient>[0];
type Response = Parameters<typeof registerMcpServerOAuthClient>[1];

function createMockOAuthClient(
  overrides: Partial<McpServerOAuthClient> = {},
): McpServerOAuthClient {
  return {
    id: "mock-id",
    createdAt: new Date(),
    clientId: "client-id",
    clientSecret: null,
    clientName: "Test Client",
    redirectUris: ["https://example.com/callback"],
    ...overrides,
  };
}

function createMockOAuthState(
  overrides: Partial<McpServerOAuthState> = {},
): McpServerOAuthState {
  return {
    id: "mock-id",
    expiresAt: new Date(Date.now() + 600000),
    createdAt: new Date(),
    state: "mock-state",
    clientId: "client-id",
    clientRedirectUri: "https://example.com/callback",
    clientState: "client-state",
    clientCodeChallenge: null,
    clientCodeChallengeMethod: null,
    ...overrides,
  };
}

function createMockAuthorizationCode(
  overrides: Partial<McpServerAuthorizationCode> = {},
): McpServerAuthorizationCode {
  return {
    id: "mock-id",
    userId: "user-id",
    expiresAt: new Date(Date.now() + 300000),
    createdAt: new Date(),
    clientId: "client-id",
    clientRedirectUri: "https://example.com/callback",
    clientCodeChallenge: null,
    clientCodeChallengeMethod: null,
    scope: "fathom:read",
    code: "auth-code",
    used: null,
    ...overrides,
  };
}

function createMockFathomToken(
  overrides: Partial<FathomOAuthToken> = {},
): FathomOAuthToken {
  return {
    id: "mock-id",
    userId: "user-id",
    accessToken: "encrypted-access-token",
    refreshToken: "encrypted-refresh-token",
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("oauth/controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildFathomOAuthAuthorizationUrl", () => {
    it("builds correct authorization URL", () => {
      const url = buildFathomOAuthAuthorizationUrl("test-state");

      expect(url).toContain("https://fathom.video");
      expect(url).toContain("/external/v1/oauth2/authorize");
      expect(url).toContain("state=test-state");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("response_type=code");
    });
  });

  describe("registerMcpServerOAuthClient", () => {
    it("registers client and returns 201", async () => {
      vi.mocked(insertMcpServerOAuthClient).mockResolvedValue({
        clientId: "new-client-id",
      });

      const req = createMockRequest({
        body: {
          redirect_uris: ["https://example.com/callback"],
          client_name: "Test Client",
        },
      });
      const res = createMockResponse();

      await registerMcpServerOAuthClient(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: "new-client-id",
          redirect_uris: ["https://example.com/callback"],
          client_name: "Test Client",
        }),
      );
    });

    it("throws on invalid redirect_uris", async () => {
      const req = createMockRequest({
        body: {
          redirect_uris: ["not-a-url"],
        },
      });
      const res = createMockResponse();

      await expect(registerMcpServerOAuthClient(req, res)).rejects.toThrow();
    });
  });

  describe("authorizeClientAndRedirectToFathom", () => {
    it("redirects to Fathom OAuth when client is valid", async () => {
      vi.mocked(findMcpServerOAuthClient).mockResolvedValue(
        createMockOAuthClient(),
      );
      vi.mocked(createMcpServerOAuthState).mockResolvedValue("mcp-state");

      const req = createMockRequest({
        query: {
          client_id: "client-id",
          redirect_uri: "https://example.com/callback",
          response_type: "code",
          state: "client-state",
        },
      });
      const res = createMockResponse();

      await authorizeClientAndRedirectToFathom(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("fathom.video"),
      );
    });

    it("throws when client not found", async () => {
      vi.mocked(findMcpServerOAuthClient).mockResolvedValue(null);

      const req = createMockRequest({
        query: {
          client_id: "unknown-client",
          redirect_uri: "https://example.com/callback",
          response_type: "code",
          state: "state",
        },
      });
      const res = createMockResponse();

      await expect(
        authorizeClientAndRedirectToFathom(req, res),
      ).rejects.toThrow();
    });

    it("throws when redirect_uri not registered", async () => {
      vi.mocked(findMcpServerOAuthClient).mockResolvedValue(
        createMockOAuthClient({
          redirectUris: ["https://registered.com/callback"],
        }),
      );

      const req = createMockRequest({
        query: {
          client_id: "client-id",
          redirect_uri: "https://unregistered.com/callback",
          response_type: "code",
          state: "state",
        },
      });
      const res = createMockResponse();

      await expect(
        authorizeClientAndRedirectToFathom(req, res),
      ).rejects.toThrow();
    });
  });

  describe("completeFathomAuthAndRedirectClient", () => {
    it("exchanges code and redirects client", async () => {
      vi.mocked(getMcpServerOAuthState).mockResolvedValue(
        createMockOAuthState(),
      );
      vi.mocked(createMcpServerAuthorizationCode).mockResolvedValue(
        "mcp-auth-code",
      );
      vi.mocked(insertFathomToken).mockResolvedValue(undefined);
      vi.mocked(deleteMcpServerOAuthState).mockResolvedValue(undefined);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "fathom-access",
              refresh_token: "fathom-refresh",
              expires_in: 3600,
              token_type: "Bearer",
            }),
        }),
      );

      const req = createMockRequest({
        query: {
          code: "fathom-code",
          state: "mcp-state",
        },
      });
      const res = createMockResponse();

      await completeFathomAuthAndRedirectClient(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("/oauth/success"),
      );
    });

    it("throws when state is invalid", async () => {
      vi.mocked(getMcpServerOAuthState).mockResolvedValue(null);

      const req = createMockRequest({
        query: {
          code: "code",
          state: "invalid-state",
        },
      });
      const res = createMockResponse();

      await expect(
        completeFathomAuthAndRedirectClient(req, res),
      ).rejects.toThrow();
    });
  });

  describe("exchangeCodeForMcpAccessToken", () => {
    it("exchanges code for access token", async () => {
      vi.mocked(consumeMcpServerAuthorizationCode).mockResolvedValue(
        createMockAuthorizationCode(),
      );
      vi.mocked(createMcpServerAccessToken).mockResolvedValue("access-token");

      const req = createMockRequest({
        body: {
          grant_type: "authorization_code",
          code: "auth-code",
        },
      });
      const res = createMockResponse();

      await exchangeCodeForMcpAccessToken(req, res);

      expect(res.json).toHaveBeenCalledWith({
        access_token: "access-token",
        token_type: "Bearer",
        scope: "fathom:read",
      });
    });

    it("throws on invalid code", async () => {
      vi.mocked(consumeMcpServerAuthorizationCode).mockResolvedValue(null);

      const req = createMockRequest({
        body: {
          grant_type: "authorization_code",
          code: "invalid-code",
        },
      });
      const res = createMockResponse();

      await expect(exchangeCodeForMcpAccessToken(req, res)).rejects.toThrow();
    });

    it("verifies PKCE when code challenge exists", async () => {
      vi.mocked(consumeMcpServerAuthorizationCode).mockResolvedValue(
        createMockAuthorizationCode({
          clientCodeChallenge: "challenge",
          clientCodeChallengeMethod: "S256",
        }),
      );
      vi.mocked(verifyMcpServerPKCE).mockReturnValue(true);
      vi.mocked(createMcpServerAccessToken).mockResolvedValue("access-token");

      const req = createMockRequest({
        body: {
          grant_type: "authorization_code",
          code: "auth-code",
          code_verifier: "verifier",
        },
      });
      const res = createMockResponse();

      await exchangeCodeForMcpAccessToken(req, res);

      expect(verifyMcpServerPKCE).toHaveBeenCalledWith(
        "verifier",
        "challenge",
        "S256",
      );
      expect(res.json).toHaveBeenCalled();
    });

    it("throws when PKCE verification fails", async () => {
      vi.mocked(consumeMcpServerAuthorizationCode).mockResolvedValue(
        createMockAuthorizationCode({
          clientCodeChallenge: "challenge",
          clientCodeChallengeMethod: "S256",
        }),
      );
      vi.mocked(verifyMcpServerPKCE).mockReturnValue(false);

      const req = createMockRequest({
        body: {
          grant_type: "authorization_code",
          code: "auth-code",
          code_verifier: "wrong-verifier",
        },
      });
      const res = createMockResponse();

      await expect(exchangeCodeForMcpAccessToken(req, res)).rejects.toThrow();
    });

    it("throws when code_verifier missing but PKCE required", async () => {
      vi.mocked(consumeMcpServerAuthorizationCode).mockResolvedValue(
        createMockAuthorizationCode({
          clientCodeChallenge: "challenge",
          clientCodeChallengeMethod: "S256",
        }),
      );

      const req = createMockRequest({
        body: {
          grant_type: "authorization_code",
          code: "auth-code",
        },
      });
      const res = createMockResponse();

      await expect(exchangeCodeForMcpAccessToken(req, res)).rejects.toThrow();
    });
  });

  describe("fetchFathomOAuthToken", () => {
    it("returns null when no stored token", async () => {
      vi.mocked(getFathomOAuthToken).mockResolvedValue(null);

      const result = await fetchFathomOAuthToken("user-123");

      expect(result).toBeNull();
    });

    it("returns decrypted token when not expired", async () => {
      vi.mocked(getFathomOAuthToken).mockResolvedValue(
        createMockFathomToken({ expiresAt: new Date(Date.now() + 3600000) }),
      );

      const result = await fetchFathomOAuthToken("user-123");

      expect(result).toBe("decrypted-encrypted-access-token");
    });

    it("refreshes token when expired", async () => {
      vi.mocked(getFathomOAuthToken).mockResolvedValue(
        createMockFathomToken({ expiresAt: new Date(Date.now() - 1000) }),
      );
      vi.mocked(insertFathomToken).mockResolvedValue(undefined);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "new-access-token",
              refresh_token: "new-refresh-token",
              expires_in: 3600,
              token_type: "Bearer",
            }),
        }),
      );

      const result = await fetchFathomOAuthToken("user-123");

      expect(result).toBe("new-access-token");
      expect(insertFathomToken).toHaveBeenCalled();
    });
  });

  describe("exchangeCodeForFathomToken", () => {
    it("exchanges code successfully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "access-token",
              refresh_token: "refresh-token",
              expires_in: 3600,
              token_type: "Bearer",
            }),
        }),
      );

      const result = await exchangeCodeForFathomToken("auth-code");

      expect(result.access_token).toBe("access-token");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/oauth2/token"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("throws on failed exchange", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
        }),
      );

      await expect(exchangeCodeForFathomToken("bad-code")).rejects.toThrow();
    });
  });

  describe("refreshFathomToken", () => {
    it("refreshes token successfully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "new-access-token",
              refresh_token: "new-refresh-token",
              expires_in: 3600,
              token_type: "Bearer",
            }),
        }),
      );

      const result = await refreshFathomToken("old-refresh-token");

      expect(result.access_token).toBe("new-access-token");
    });

    it("throws on failed refresh", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
        }),
      );

      await expect(refreshFathomToken("invalid-token")).rejects.toThrow();
    });
  });
});
