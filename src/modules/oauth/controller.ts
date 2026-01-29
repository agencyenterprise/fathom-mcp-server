import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { AppError } from "../../middleware/error";
import { FathomService } from "../fathom";
import {
  authorizeQuerySchema,
  clientRegistrationBodySchema,
  fathomCallbackQuerySchema,
  tokenExchangeBodySchema,
} from "./schema";
import { OAuthService } from "./service";

export async function handleRegister(req: Request, res: Response) {
  const body = clientRegistrationBodySchema.parse(req.body);

  const { clientId } = await OAuthService.registerClient(
    body.redirect_uris,
    body.client_name,
  );

  res.status(201).json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: body.redirect_uris,
    client_name: body.client_name,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
  });
}

export async function handleAuthorize(req: Request, res: Response) {
  const {
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
  } = authorizeQuerySchema.parse(req.query);

  const client = await OAuthService.getClient(client_id);
  if (!client) {
    throw new AppError(400, "invalid_client", "Unknown client_id");
  }

  if (!client.redirectUris.includes(redirect_uri)) {
    throw new AppError(
      400,
      "invalid_redirect_uri",
      "redirect_uri not registered for this client",
    );
  }

  const internalState = await OAuthService.createOAuthState({
    clientId: client_id,
    redirectUri: redirect_uri,
    state,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method,
  });

  const fathomAuthUrl = FathomService.getAuthorizationUrl(internalState);
  res.redirect(fathomAuthUrl);
}

export async function handleFathomCallback(req: Request, res: Response) {
  const { code, state } = fathomCallbackQuerySchema.parse(req.query);

  const stateRecord = await OAuthService.getValidOAuthState(state);

  if (!stateRecord) {
    throw new AppError(
      400,
      "invalid_state",
      "Invalid or expired state parameter",
    );
  }

  const tokens = await FathomService.exchangeCodeForTokens(code);
  const userId = randomUUID();
  await FathomService.storeTokens(userId, tokens);

  await OAuthService.deleteOAuthState(state);

  const authCode = await OAuthService.createAuthorizationCode(
    userId,
    stateRecord.clientId,
    stateRecord.claudeRedirectUri,
    stateRecord.claudeCodeChallenge,
    stateRecord.claudeCodeChallengeMethod,
  );

  const redirectUrl = new URL(stateRecord.claudeRedirectUri);
  redirectUrl.searchParams.set("code", authCode);
  redirectUrl.searchParams.set("state", stateRecord.claudeState);

  res.redirect(redirectUrl.toString());
}

export async function handleTokenExchange(req: Request, res: Response) {
  const { code, code_verifier } = tokenExchangeBodySchema.parse(req.body);

  const codeRecord = await OAuthService.getValidAuthorizationCode(code);

  if (!codeRecord) {
    throw new AppError(
      400,
      "invalid_grant",
      "Invalid or expired authorization code",
    );
  }

  const codeAlreadyExchanged = codeRecord.used !== null;
  if (codeAlreadyExchanged) {
    throw new AppError(
      400,
      "invalid_grant",
      "Authorization code has already been used",
    );
  }

  if (codeRecord.claudeCodeChallenge && codeRecord.claudeCodeChallengeMethod) {
    if (!code_verifier) {
      throw new AppError(
        400,
        "invalid_request",
        "Missing code_verifier for PKCE",
      );
    }

    const isValid = OAuthService.verifyPKCE(
      code_verifier,
      codeRecord.claudeCodeChallenge,
      codeRecord.claudeCodeChallengeMethod,
    );

    if (!isValid) {
      throw new AppError(400, "invalid_grant", "Invalid code_verifier");
    }
  }

  await OAuthService.markAuthorizationCodeUsed(code);

  const token = await OAuthService.createAccessToken(
    codeRecord.userId,
    codeRecord.scope,
  );

  res.json({
    access_token: token,
    token_type: "Bearer",
    scope: codeRecord.scope,
  });
}
