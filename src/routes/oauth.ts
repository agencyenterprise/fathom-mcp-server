import { Router } from "express";
import { oauthRateLimiter } from "../middleware/rateLimit";
import {
  authorizeClientAndRedirectToFathom,
  completeFathomAuthAndRedirectClient,
  exchangeCodeForMcpAccessToken,
  registerMcpServerOAuthClient,
} from "../modules/oauth/controller";
import { renderOAuthSuccessPage } from "../modules/oauth/success-page";

const router = Router();

router.post("/register", oauthRateLimiter, (req, res, next) =>
  registerMcpServerOAuthClient(req, res).catch(next),
);
router.get("/authorize", oauthRateLimiter, (req, res, next) =>
  authorizeClientAndRedirectToFathom(req, res).catch(next),
);
router.get("/fathom/callback", oauthRateLimiter, (req, res, next) =>
  completeFathomAuthAndRedirectClient(req, res).catch(next),
);
router.post("/token", oauthRateLimiter, (req, res, next) =>
  exchangeCodeForMcpAccessToken(req, res).catch(next),
);
router.get("/success", oauthRateLimiter, renderOAuthSuccessPage);

export default router;
