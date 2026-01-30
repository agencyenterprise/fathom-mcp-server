import { z } from "zod";

export const clientRegistrationReqSchema = z.object({
  redirect_uris: z.array(z.string().url()),
  client_name: z.string().optional(),
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
});
export type ClientRegistrationReqType = z.infer<
  typeof clientRegistrationReqSchema
>;

export const authorizeReqSchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string().url(),
  response_type: z.literal("code"),
  state: z.string(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(["S256", "plain"]).optional(),
});
export type AuthorizeReqType = z.infer<typeof authorizeReqSchema>;

export const fathomCallbackReqSchema = z.object({
  code: z.string(),
  state: z.string(),
});
export type FathomCallbackReqType = z.infer<typeof fathomCallbackReqSchema>;

export const tokenExchangeReqSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string(),
  client_id: z.string().optional(),
  redirect_uri: z.string().optional(),
  code_verifier: z.string().optional(),
});
export type TokenExchangeReqType = z.infer<typeof tokenExchangeReqSchema>;

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
