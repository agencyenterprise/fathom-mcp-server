import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { AppError } from "../../middleware/error";
import { FathomService } from "../fathom";
import {
  authorizeQuerySchema,
  fathomCallbackQuerySchema,
  tokenExchangeBodySchema,
} from "./schema";
import { OAuthService } from "./service";

export class OAuthController {
  static async handleAuthorize(req: Request, res: Response) {
    const {
      redirect_uri,
      response_type,
      state,
      code_challenge,
      code_challenge_method,
    } = authorizeQuerySchema.parse(req.query);

    if (response_type && response_type !== "code") {
      throw new AppError(
        400,
        "unsupported_response_type",
        "Only 'code' response type is supported",
      );
    }

    const internalState = await OAuthService.createOAuthState({
      redirectUri: redirect_uri,
      state,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
    });

    const fathomAuthUrl = FathomService.getAuthorizationUrl(internalState);
    res.redirect(fathomAuthUrl);
  }

  static async handleFathomCallback(req: Request, res: Response) {
    const { code, state, error, error_description } =
      fathomCallbackQuerySchema.parse(req.query);

    if (error) {
      throw new AppError(
        400,
        error,
        error_description || "OAuth authorization failed",
      );
    }

    if (!code || !state) {
      throw new AppError(
        400,
        "invalid_request",
        "Missing code or state parameter",
      );
    }

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
      stateRecord.claudeRedirectUri,
      stateRecord.claudeCodeChallenge,
      stateRecord.claudeCodeChallengeMethod,
    );

    const redirectUrl = new URL(stateRecord.claudeRedirectUri);
    redirectUrl.searchParams.set("code", authCode);
    redirectUrl.searchParams.set("state", stateRecord.claudeState);

    res.redirect(redirectUrl.toString());
  }

  static async handleTokenExchange(req: Request, res: Response) {
    const { grant_type, code, code_verifier } = tokenExchangeBodySchema.parse(
      req.body,
    );

    if (grant_type !== "authorization_code") {
      throw new AppError(
        400,
        "unsupported_grant_type",
        "Only 'authorization_code' grant type is supported",
      );
    }

    const codeRecord = await OAuthService.getValidAuthorizationCode(code);

    if (!codeRecord) {
      throw new AppError(
        400,
        "invalid_grant",
        "Invalid or expired authorization code",
      );
    }

    if (codeRecord.used) {
      throw new AppError(
        400,
        "invalid_grant",
        "Authorization code has already been used",
      );
    }

    if (
      codeRecord.claudeCodeChallenge &&
      codeRecord.claudeCodeChallengeMethod
    ) {
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
}
