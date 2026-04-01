CREATE TABLE "mcp_server_refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"scope" text DEFAULT 'fathom:read' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "mcp_server_refresh_tokens_token_unique" UNIQUE("token"),
	CONSTRAINT "mcp_server_refresh_tokens_user_client_uniq" UNIQUE("user_id","client_id")
);
--> statement-breakpoint
CREATE INDEX "mcp_server_refresh_tokens_expires_at_idx" ON "mcp_server_refresh_tokens" USING btree ("expires_at");