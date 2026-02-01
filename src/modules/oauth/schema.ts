import { z } from "zod";

export const fathomTokenResSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});
export type FathomTokenResType = z.infer<typeof fathomTokenResSchema>;

export const registerMcpServerOAuthClientReqSchema = z.object({
  redirect_uris: z.array(z.url()),
  client_name: z.string().optional(),
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
});

export const authorizeClientAndRedirectToFathomReqSchema = z.object({
  client_id: z.string(),
  redirect_uri: z.url(),
  response_type: z.literal("code"),
  state: z.string(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(["S256", "plain"]).optional(),
});

export const completeFathomAuthAndRedirectClientReqSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const exchangeCodeForMcpAccessTokenReqSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string(),
  client_id: z.string().optional(),
  redirect_uri: z.string().optional(),
  code_verifier: z.string().optional(),
});
