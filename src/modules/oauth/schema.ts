import { z } from "zod";

export const clientRegistrationBodySchema = z.object({
  redirect_uris: z.array(z.string()),
  client_name: z.string().optional(),
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
});
export type ClientRegistrationBodyType = z.infer<
  typeof clientRegistrationBodySchema
>;

export const authorizeQuerySchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string(),
  response_type: z.string().optional(),
  scope: z.string().optional(),
  state: z.string(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional(),
});
export type AuthorizeQueryType = z.infer<typeof authorizeQuerySchema>;

export const fathomCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});
export type FathomCallbackQueryType = z.infer<typeof fathomCallbackQuerySchema>;

export const tokenExchangeBodySchema = z.object({
  grant_type: z.string(),
  code: z.string(),
  client_id: z.string().optional(),
  redirect_uri: z.string().optional(),
  code_verifier: z.string().optional(),
});
export type TokenExchangeBodyType = z.infer<typeof tokenExchangeBodySchema>;

export const createOAuthStateParamsSchema = z.object({
  clientId: z.string(),
  redirectUri: z.string(),
  state: z.string(),
  codeChallenge: z.string().optional(),
  codeChallengeMethod: z.string().optional(),
});
export type CreateOAuthStateParamsType = z.infer<
  typeof createOAuthStateParamsSchema
>;
