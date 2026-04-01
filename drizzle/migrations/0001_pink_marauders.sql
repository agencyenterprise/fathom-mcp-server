CREATE TABLE "mcp_server_refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"scope" text DEFAULT 'fathom:read' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "mcp_server_refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX "mcp_server_refresh_tokens_expires_at_idx" ON "mcp_server_refresh_tokens" USING btree ("expires_at");