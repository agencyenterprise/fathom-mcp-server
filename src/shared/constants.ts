export const ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
export const STALE_TERMINATION_CUTOFF_MS = 24 * 60 * 60 * 1000; // 24 hours

export const FATHOM_API_TIMEOUT_MS = 30 * 1000; // 30 seconds

export const BEARER_PREFIX = "Bearer ";
export const DEFAULT_SCOPE = "fathom:read";
export const OAUTH_GRANT_TYPE_AUTH_CODE = "authorization_code";
export const OAUTH_GRANT_TYPE_REFRESH = "refresh_token";
export const OAUTH_RESPONSE_TYPE_CODE = "code";
export const FATHOM_API_SCOPE = "public_api";
