import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
  fathomOAuthTokens: {},
  mcpServerAccessTokens: {},
  mcpServerAuthorizationCodes: {},
  mcpServerOAuthClients: {},
  mcpServerOAuthStates: {},
  mcpServerRefreshTokens: {},
}));

vi.mock("../../../utils/crypto", () => ({
  decrypt: vi.fn((val: string) => `decrypted-${val}`),
  encrypt: vi.fn((val: string) => `encrypted-${val}`),
}));

import { db } from "../../../db";
import {
  cleanupExpiredMcpServerOAuthData,
  consumeMcpServerAuthorizationCode,
  consumeMcpServerRefreshToken,
  createMcpServerAccessToken,
  createMcpServerAuthorizationCode,
  createMcpServerOAuthState,
  createMcpServerRefreshToken,
  deleteMcpServerOAuthState,
  fetchFathomOAuthToken,
  findMcpServerOAuthClient,
  getFathomOAuthToken,
  getMcpServerAccessToken,
  getMcpServerOAuthState,
  insertFathomToken,
  insertMcpServerOAuthClient,
  refreshFathomToken,
  verifyMcpServerPKCE,
} from "../../../modules/oauth/service";

describe("oauth/service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verifyMcpServerPKCE", () => {
    it("verifies S256 challenge correctly", () => {
      const verifier = "test-code-verifier-string";
      const challenge = createHash("sha256")
        .update(verifier)
        .digest("base64url");

      expect(verifyMcpServerPKCE(verifier, challenge, "S256")).toBe(true);
    });

    it("rejects invalid S256 verifier", () => {
      const challenge = createHash("sha256")
        .update("correct-verifier")
        .digest("base64url");

      expect(verifyMcpServerPKCE("wrong-verifier", challenge, "S256")).toBe(
        false,
      );
    });

    it("verifies plain challenge correctly", () => {
      const verifier = "plain-verifier";
      expect(verifyMcpServerPKCE(verifier, verifier, "plain")).toBe(true);
    });

    it("rejects invalid plain verifier", () => {
      expect(verifyMcpServerPKCE("wrong", "correct", "plain")).toBe(false);
    });
  });

  describe("insertMcpServerOAuthClient", () => {
    it("inserts client and returns clientId", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await insertMcpServerOAuthClient(
        ["https://example.com/callback"],
        "Test Client",
      );

      expect(result.clientId).toBeDefined();
      expect(typeof result.clientId).toBe("string");
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe("findMcpServerOAuthClient", () => {
    it("returns client when found", async () => {
      const mockClient = {
        clientId: "test-client-id",
        redirectUris: ["https://example.com"],
      };
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockClient]),
          }),
        }),
      } as never);

      const result = await findMcpServerOAuthClient("test-client-id");

      expect(result).toEqual(mockClient);
    });

    it("returns null when not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await findMcpServerOAuthClient("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createMcpServerOAuthState", () => {
    it("creates state and returns state string", async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as never);

      const result = await createMcpServerOAuthState(
        "client-id",
        "https://redirect.com",
        "client-state",
        "challenge",
        "S256",
      );

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getMcpServerOAuthState", () => {
    it("returns state when found and not expired", async () => {
      const mockState = {
        state: "test-state",
        clientId: "client-id",
        expiresAt: new Date(Date.now() + 60000),
      };
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockState]),
          }),
        }),
      } as never);

      const result = await getMcpServerOAuthState("test-state");

      expect(result).toEqual(mockState);
    });

    it("returns null when not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await getMcpServerOAuthState("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("deleteMcpServerOAuthState", () => {
    it("deletes state by state string", async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere,
      } as never);

      await deleteMcpServerOAuthState("test-state");

      expect(db.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("createMcpServerAuthorizationCode", () => {
    it("creates authorization code", async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as never);

      const result = await createMcpServerAuthorizationCode(
        "user-id",
        "client-id",
        "https://redirect.com",
        "challenge",
        "S256",
      );

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("consumeMcpServerAuthorizationCode", () => {
    it("returns and marks code as used when valid", async () => {
      const mockCode = {
        code: "test-code",
        userId: "user-id",
        used: null,
      };
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockCode]),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return callback(tx as any);
      });

      const result = await consumeMcpServerAuthorizationCode("test-code");

      expect(result).toEqual(mockCode);
    });

    it("returns null when code not found or expired", async () => {
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return callback(tx as any);
      });

      const result = await consumeMcpServerAuthorizationCode("invalid-code");

      expect(result).toBeNull();
    });
  });

  describe("createMcpServerAccessToken", () => {
    it("creates access token", async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as never);

      const result = await createMcpServerAccessToken("user-id", "fathom:read");

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("createMcpServerRefreshToken", () => {
    it("creates refresh token and returns token string", async () => {
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as never);

      const result = await createMcpServerRefreshToken(
        "user-id",
        "client-id",
        "fathom:read",
      );

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(mockValues).toHaveBeenCalled();
    });
  });

  describe("consumeMcpServerRefreshToken", () => {
    it("returns record and deletes token when valid", async () => {
      const mockRecord = {
        id: "mock-id",
        token: "refresh-token",
        userId: "user-id",
        clientId: "client-id",
        scope: "fathom:read",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      };
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockRecord]),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return callback(tx as any);
      });

      const result = await consumeMcpServerRefreshToken("refresh-token");

      expect(result).toEqual(mockRecord);
    });

    it("returns null when token not found or expired", async () => {
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return callback(tx as any);
      });

      const result = await consumeMcpServerRefreshToken("invalid-token");

      expect(result).toBeNull();
    });
  });

  describe("getMcpServerAccessToken", () => {
    it("returns token when found and not expired", async () => {
      const mockToken = {
        token: "test-token",
        userId: "user-id",
        expiresAt: new Date(Date.now() + 60000),
      };
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockToken]),
          }),
        }),
      } as never);

      const result = await getMcpServerAccessToken("test-token");

      expect(result).toEqual(mockToken);
    });

    it("returns null when not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await getMcpServerAccessToken("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("insertFathomToken", () => {
    it("inserts or updates fathom token", async () => {
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as never);

      await insertFathomToken("user-id", {
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
        token_type: "Bearer",
      });

      expect(db.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalled();
    });
  });

  describe("getFathomOAuthToken", () => {
    it("returns token when found", async () => {
      const mockToken = {
        userId: "user-id",
        accessToken: "encrypted-access",
        refreshToken: "encrypted-refresh",
        expiresAt: new Date(),
      };
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockToken]),
          }),
        }),
      } as never);

      const result = await getFathomOAuthToken("user-id");

      expect(result).toEqual(mockToken);
    });

    it("returns null when not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await getFathomOAuthToken("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("cleanupExpiredMcpServerOAuthData", () => {
    it("deletes expired data and returns counts", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({}),
      } as never);
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 5 }),
      } as never);

      const result = await cleanupExpiredMcpServerOAuthData();

      expect(result.oauthStates).toBe(5);
      expect(result.authorizationCodes).toBe(5);
      expect(result.accessTokens).toBe(5);
      expect(result.refreshTokens).toBe(5);
      expect(result.fathomTokens).toBe(5);
    });

    it("handles null rowCount", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({}),
      } as never);
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: null }),
      } as never);

      const result = await cleanupExpiredMcpServerOAuthData();

      expect(result.oauthStates).toBe(0);
      expect(result.authorizationCodes).toBe(0);
      expect(result.accessTokens).toBe(0);
      expect(result.refreshTokens).toBe(0);
      expect(result.fathomTokens).toBe(0);
    });
  });

  describe("fetchFathomOAuthToken", () => {
    it("returns null when no stored token exists for user", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      const result = await fetchFathomOAuthToken("user-123");

      expect(result).toBeNull();
    });

    it("returns decrypted access token when token is not yet expired", async () => {
      const mockToken = {
        userId: "user-123",
        accessToken: "encrypted-access-token",
        refreshToken: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      };
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockToken]),
          }),
        }),
      } as never);

      const result = await fetchFathomOAuthToken("user-123");

      expect(result).toBe("decrypted-encrypted-access-token");
    });

    it("refreshes and stores a new Fathom token when the access token is expired", async () => {
      const expiredToken = {
        userId: "user-123",
        accessToken: "encrypted-access-token",
        refreshToken: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() - 1000),
      };
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([expiredToken]),
          }),
        }),
      } as never);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      } as never);
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
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("refreshFathomToken", () => {
    it("exchanges a refresh token for a new Fathom token", async () => {
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

    it("throws AppError when Fathom token refresh fails", async () => {
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
