import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { oauthError, validationError } from "../../shared/errors";
import {
  consumeClaudeAuthCode,
  createClaudeAccessToken,
  createClaudeAuthCode,
  createClaudeState,
  deleteClaudeState,
  findClaudeClient,
  getClaudeState,
  createClaudeClient,
  verifyPKCE,
} from "./claude";
import {
  exchangeCodeForFathomTokens,
  getFathomAuthUrl,
  storeFathomTokens,
} from "./fathom";
import {
  authorizeReqSchema,
  clientRegistrationReqSchema,
  fathomCallbackReqSchema,
  tokenExchangeReqSchema,
} from "./schema";

export async function postClaudeClient(req: Request, res: Response) {
  const { redirect_uris, client_name } = clientRegistrationReqSchema.parse(req.body);

  const { clientId } = await createClaudeClient(
    redirect_uris,
    client_name,
  );

  res.status(201).json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris,
    client_name,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
  });
}

export async function getClaudeClient(req: Request, res: Response) {
  const {
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
  } = authorizeReqSchema.parse(req.query);

  const client = await findClaudeClient(client_id);
  if (!client) {
    throw oauthError("invalid_client", "Unknown client_id");
  }

  if (!client.redirectUris.includes(redirect_uri)) {
    throw oauthError(
      "invalid_redirect_uri",
      "redirect_uri not registered for this client",
    );
  }

  const internalState = await createClaudeState({
    clientId: client_id,
    redirectUri: redirect_uri,
    state,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method,
  });

  const fathomAuthUrl = getFathomAuthUrl(internalState);
  res.redirect(fathomAuthUrl);
}

export async function getFathomCallback(req: Request, res: Response) {
  const { code, state } = fathomCallbackReqSchema.parse(req.query);
  const claudeState = await getClaudeState(state);

  if (!claudeState) {
    throw oauthError("invalid_claude_state", "Invalid or expired claude state parameter");
  }
  
  const tokens = await exchangeCodeForFathomTokens(code);
  const userId = randomUUID();
  await storeFathomTokens(userId, tokens);
  
  await deleteClaudeState(state);

  const claudeAuthCode = await createClaudeAuthCode(
    userId,
    claudeState.clientId,
    claudeState.claudeRedirectUri,
    claudeState.claudeCodeChallenge,
    claudeState.claudeCodeChallengeMethod,
  );

  const claudeRedirectUrl = new URL(claudeState.claudeRedirectUri);
  claudeRedirectUrl.searchParams.set("code", claudeAuthCode);
  claudeRedirectUrl.searchParams.set("state", claudeState.claudeState);

  const successUrl = `/oauth-success.html?redirect=${encodeURIComponent(claudeRedirectUrl.toString())}`;
  res.redirect(successUrl);
}

export async function postClaudeAccessToken(req: Request, res: Response) {
  const { code, code_verifier } = tokenExchangeReqSchema.parse(req.body);

  const codeRecord = await consumeClaudeAuthCode(code);

  if (!codeRecord) {
    throw oauthError(
      "invalid_grant",
      "Invalid, expired, or already used authorization code",
    );
  }

  if (codeRecord.claudeCodeChallenge && codeRecord.claudeCodeChallengeMethod) {
    if (!code_verifier) {
      throw validationError("Missing code_verifier for PKCE");
    }

    const isValid = verifyPKCE(
      code_verifier,
      codeRecord.claudeCodeChallenge,
      codeRecord.claudeCodeChallengeMethod,
    );

    if (!isValid) {
      throw oauthError("invalid_grant", "Invalid code_verifier");
    }
  }

  const token = await createClaudeAccessToken(codeRecord.userId, codeRecord.scope);

  res.json({
    access_token: token,
    token_type: "Bearer",
    scope: codeRecord.scope,
  });
}
