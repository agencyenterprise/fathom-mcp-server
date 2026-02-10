import type { InferSelectModel } from "drizzle-orm";
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

export const mcpServerOAuthStates = pgTable(
  "mcp_server_oauth_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    state: text("state").notNull().unique(),
    clientId: text("client_id").notNull(),
    clientRedirectUri: text("client_redirect_uri").notNull(),
    clientState: text("client_state").notNull(),
    clientCodeChallenge: text("client_code_challenge"),
    clientCodeChallengeMethod: text("client_code_challenge_method"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    index("mcp_server_oauth_states_expires_at_idx").on(table.expiresAt),
  ],
);

export const mcpServerAccessTokens = pgTable(
  "mcp_server_access_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    userId: text("user_id").notNull(),
    scope: text("scope").notNull().default("fathom:read"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    index("mcp_server_access_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export const mcpServerAuthorizationCodes = pgTable(
  "mcp_server_authorization_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    userId: text("user_id").notNull(),
    clientId: text("client_id").notNull(),
    clientRedirectUri: text("client_redirect_uri").notNull(),
    clientCodeChallenge: text("client_code_challenge"),
    clientCodeChallengeMethod: text("client_code_challenge_method"),
    scope: text("scope").notNull().default("fathom:read"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: timestamp("used"),
  },
  (table) => [
    index("mcp_server_authorization_codes_expires_at_idx").on(table.expiresAt),
  ],
);

export const mcpServerOAuthClients = pgTable("mcp_server_oauth_clients", {
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
    expiresAt: timestamp("expires_at").notNull(),
    terminatedAt: timestamp("terminated_at"),
  },
  (table) => [
    index("mcp_sessions_expires_at_idx").on(table.expiresAt),
    index("mcp_sessions_terminated_at_idx").on(table.terminatedAt),
  ],
);

export type FathomOAuthToken = InferSelectModel<typeof fathomOAuthTokens>;
export type McpServerOAuthState = InferSelectModel<typeof mcpServerOAuthStates>;
export type McpServerAccessToken = InferSelectModel<
  typeof mcpServerAccessTokens
>;
export type McpServerAuthorizationCode = InferSelectModel<
  typeof mcpServerAuthorizationCodes
>;
export type McpServerOAuthClient = InferSelectModel<
  typeof mcpServerOAuthClients
>;
export type McpSession = InferSelectModel<typeof mcpSessions>;
