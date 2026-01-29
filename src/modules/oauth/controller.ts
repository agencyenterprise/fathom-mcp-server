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

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Connected - Fathom MCP</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #fff;
        }
        main { text-align: center; }
        .checkmark {
          width: 64px;
          height: 64px;
          margin: 0 auto 24px;
          border-radius: 50%;
          background: #22c55e;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .checkmark svg { width: 32px; height: 32px; }
        h1 { font-size: 24px; font-weight: 500; margin-bottom: 8px; }
        p { color: #888; font-size: 14px; }
      </style>
    </head>
    <body>
      <main>
        <div class="checkmark">
          <svg fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h1>Connected to Fathom</h1>
        <p>Redirecting you back to Claude...</p>
      </main>
      <script>
        setTimeout(() => {
          window.location.href = "${redirectUrl.toString()}";
        }, 1500);
      </script>
    </body>
    </html>
  `);
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
