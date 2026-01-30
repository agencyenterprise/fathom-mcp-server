import {
  index,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const fathomOAuthTokens = pgTable(
  "fathom_oauth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().unique(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("fathom_oauth_tokens_expires_at_idx").on(table.expiresAt)],
);

export const oauthStates = pgTable(
  "oauth_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    state: text("state").notNull().unique(),
    clientId: text("client_id").notNull(),
    claudeRedirectUri: text("claude_redirect_uri").notNull(),
    claudeState: text("claude_state").notNull(),
    claudeCodeChallenge: text("claude_code_challenge"),
    claudeCodeChallengeMethod: text("claude_code_challenge_method"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("oauth_states_expires_at_idx").on(table.expiresAt)],
);

export const serverAccessTokens = pgTable(
  "server_access_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    userId: text("user_id").notNull(),
    scope: text("scope").notNull().default("fathom:read"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("server_access_tokens_expires_at_idx").on(table.expiresAt)],
);

export const authorizationCodes = pgTable(
  "authorization_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    userId: text("user_id").notNull(),
    clientId: text("client_id").notNull(),
    claudeRedirectUri: text("claude_redirect_uri").notNull(),
    claudeCodeChallenge: text("claude_code_challenge"),
    claudeCodeChallengeMethod: text("claude_code_challenge_method"),
    scope: text("scope").notNull().default("fathom:read"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: timestamp("used"),
  },
  (table) => [index("authorization_codes_expires_at_idx").on(table.expiresAt)],
);

export const oauthClients = pgTable("oauth_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret"),
  clientName: text("client_name"),
  redirectUris: json("redirect_uris").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mcpSessions = pgTable(
  "mcp_sessions",
  {
    sessionId: uuid("session_id").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    terminatedAt: timestamp("terminated_at"),
  },
  (table) => [
    index("mcp_sessions_expires_at_idx").on(table.expiresAt),
    index("mcp_sessions_terminated_at_idx").on(table.terminatedAt),
  ],
);
