import { Router } from "express";
import { config } from "../common/config";
import { FathomController, FathomService } from "../modules/fathom";

const router = Router();

router.get("/fathom/authorize", (req, res) => {
  const state = req.query.state as string;

  if (!state) {
    res.status(400).json({ error: "Missing state parameter" });
    return;
  }

  const authUrl = FathomService.getAuthorizationUrl(state);
  res.redirect(authUrl);
});

router.get("/fathom/callback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    res.status(400).json({ error: `OAuth error: ${error}` });
    return;
  }

  if (!code || !state) {
    res.status(400).json({ error: "Missing code or state parameter" });
    return;
  }

  // The state contains the Claude user ID (passed through the OAuth flow)
  const claudeUserId = state;

  const result = await FathomController.handleOAuthCallback(code, claudeUserId);

  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }

  // Redirect back to Claude's callback to complete the MCP OAuth flow
  res.redirect(
    `${config.claude.callbackUrl}?state=${encodeURIComponent(state)}`,
  );
});

export const oauthRouter = router;
