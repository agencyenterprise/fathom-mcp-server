import { json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const oauthTokens = pgTable("oauth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: text("user_id").notNull().unique(),

  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const oauthStates = pgTable("oauth_states", {
  id: uuid("id").primaryKey().defaultRandom(),

  state: text("state").notNull().unique(),
  clientId: text("client_id").notNull(),
  claudeRedirectUri: text("claude_redirect_uri").notNull(),
  claudeState: text("claude_state").notNull(),
  claudeCodeChallenge: text("claude_code_challenge"),
  claudeCodeChallengeMethod: text("claude_code_challenge_method"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const accessTokens = pgTable("access_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),

  token: text("token").notNull().unique(),
  userId: text("user_id").notNull(),
  scope: text("scope").notNull().default("fathom:read"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authorizationCodes = pgTable("authorization_codes", {
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
});

export const oauthClients = pgTable("oauth_clients", {
  id: uuid("id").primaryKey().defaultRandom(),

  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret"),
  clientName: text("client_name"),
  redirectUris: json("redirect_uris").$type<string[]>().notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
