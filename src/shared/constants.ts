// MCP Server OAuth (we are the provider)
export const MCP_SERVER_ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MCP_SERVER_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const MCP_SERVER_AUTH_CODE_TTL_MS = 5 * 60 * 1000;
export const MCP_SERVER_DEFAULT_SCOPE = "fathom:read";

// Sessions
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
export const STALE_SESSION_CUTOFF_MS = 24 * 60 * 60 * 1000;
export const IDLE_TRANSPORT_TTL_MS = 5 * 60 * 1000;
export const IDLE_TRANSPORT_REAP_INTERVAL_MS = 60 * 1000;
export const MAX_ACTIVE_TRANSPORTS_WARN = 100;
export const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10 * 1000;

// Rate Limiting
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const MCP_RATE_LIMIT_MAX = 200;
export const OAUTH_RATE_LIMIT_MAX = 10;

// Fathom API
export const FATHOM_API_TIMEOUT_MS = 30 * 1000;
export const FATHOM_API_SCOPE = "public_api";

// OAuth (shared)
export const BEARER_PREFIX = "Bearer ";
export const OAUTH_GRANT_TYPE_AUTH_CODE = "authorization_code";
export const OAUTH_GRANT_TYPE_REFRESH = "refresh_token";
export const OAUTH_RESPONSE_TYPE_CODE = "code";
