import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { ZodError } from "zod";
import { FathomService } from "../fathom";
import {
  authorizeQuerySchema,
  fathomCallbackQuerySchema,
  tokenExchangeBodySchema,
} from "./schema";
import { OAuthService } from "./service";

export class OAuthController {
  static async handleAuthorize(req: Request, res: Response) {
    try {
      const {
        redirect_uri,
        response_type,
        state,
        code_challenge,
        code_challenge_method,
      } = authorizeQuerySchema.parse(req.query);

      if (response_type && response_type !== "code") {
        res.status(400).json({
          error: "unsupported_response_type",
          error_description: "Only 'code' response type is supported",
        });
        return;
      }

      const internalState = await OAuthService.createOAuthState({
        redirectUri: redirect_uri,
        state,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
      });

      const fathomAuthUrl = FathomService.getAuthorizationUrl(internalState);
      res.redirect(fathomAuthUrl);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "invalid_request",
          error_description: error.errors[0]?.message || "Invalid parameters",
        });
        return;
      }
      console.error("OAuth authorize error:", error);
      res.status(500).json({
        error: "server_error",
        error_description: "Failed to initiate authorization",
      });
    }
  }

  static async handleFathomCallback(req: Request, res: Response) {
    try {
      const { code, state, error, error_description } =
        fathomCallbackQuerySchema.parse(req.query);

      if (error) {
        console.error("Fathom OAuth error:", error, error_description);
        res.status(400).json({
          error,
          error_description: error_description || "OAuth authorization failed",
        });
        return;
      }

      if (!code || !state) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Missing code or state parameter",
        });
        return;
      }

      const stateRecord = await OAuthService.getValidOAuthState(state);

      if (!stateRecord) {
        res.status(400).json({
          error: "invalid_state",
          error_description: "Invalid or expired state parameter",
        });
        return;
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
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "invalid_request",
          error_description: error.errors[0]?.message || "Invalid parameters",
        });
        return;
      }
      console.error("Fathom callback error:", error);
      res.status(500).json({
        error: "server_error",
        error_description: "Failed to complete authorization",
      });
    }
  }

  static async handleTokenExchange(req: Request, res: Response) {
    try {
      const { grant_type, code, code_verifier } = tokenExchangeBodySchema.parse(
        req.body,
      );

      if (grant_type !== "authorization_code") {
        res.status(400).json({
          error: "unsupported_grant_type",
          error_description:
            "Only 'authorization_code' grant type is supported",
        });
        return;
      }

      const codeRecord = await OAuthService.getValidAuthorizationCode(code);

      if (!codeRecord) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "Invalid or expired authorization code",
        });
        return;
      }

      if (codeRecord.used) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "Authorization code has already been used",
        });
        return;
      }

      if (
        codeRecord.claudeCodeChallenge &&
        codeRecord.claudeCodeChallengeMethod
      ) {
        if (!code_verifier) {
          res.status(400).json({
            error: "invalid_request",
            error_description: "Missing code_verifier for PKCE",
          });
          return;
        }

        const isValid = OAuthService.verifyPKCE(
          code_verifier,
          codeRecord.claudeCodeChallenge,
          codeRecord.claudeCodeChallengeMethod,
        );

        if (!isValid) {
          res.status(400).json({
            error: "invalid_grant",
            error_description: "Invalid code_verifier",
          });
          return;
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
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "invalid_request",
          error_description: error.errors[0]?.message || "Invalid parameters",
        });
        return;
      }
      console.error("Token exchange error:", error);
      res.status(500).json({
        error: "server_error",
        error_description: "Failed to exchange token",
      });
    }
  }
}
