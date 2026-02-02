import { afterEach, beforeEach, vi } from "vitest";

vi.stubEnv("NODE_ENV", "staging");
vi.stubEnv("PORT", "3000");
vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost:5432/test");
vi.stubEnv("BASE_URL", "https://test.example.com");
vi.stubEnv("FATHOM_CLIENT_ID", "test-client-id");
vi.stubEnv("FATHOM_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("CLAUDE_AUTH_CALLBACK_URL", "https://claude.ai/callback");
vi.stubEnv("TOKEN_ENCRYPTION_KEY", "0".repeat(64));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});
