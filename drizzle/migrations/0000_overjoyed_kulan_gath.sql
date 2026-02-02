CREATE TABLE "fathom_oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fathom_oauth_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "mcp_server_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"scope" text DEFAULT 'fathom:read' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "mcp_server_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "mcp_server_authorization_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"client_redirect_uri" text NOT NULL,
	"client_code_challenge" text,
	"client_code_challenge_method" text,
	"scope" text DEFAULT 'fathom:read' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" timestamp,
	CONSTRAINT "mcp_server_authorization_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mcp_server_oauth_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"client_name" text,
	"redirect_uris" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_server_oauth_clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "mcp_server_oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"client_id" text NOT NULL,
	"client_redirect_uri" text NOT NULL,
	"client_state" text NOT NULL,
	"client_code_challenge" text,
	"client_code_challenge_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "mcp_server_oauth_states_state_unique" UNIQUE("state")
);
--> statement-breakpoint
CREATE TABLE "mcp_sessions" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"terminated_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "fathom_oauth_tokens_expires_at_idx" ON "fathom_oauth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "mcp_server_access_tokens_expires_at_idx" ON "mcp_server_access_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "mcp_server_authorization_codes_expires_at_idx" ON "mcp_server_authorization_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "mcp_server_oauth_states_expires_at_idx" ON "mcp_server_oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "mcp_sessions_expires_at_idx" ON "mcp_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "mcp_sessions_terminated_at_idx" ON "mcp_sessions" USING btree ("terminated_at");