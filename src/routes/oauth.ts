import { Router } from "express";
import { asyncHandler } from "../middleware/error";
import { oauthRateLimiter } from "../middleware/rateLimit";
import {
  authorizeClientAndRedirectToFathom,
  completeFathomAuthAndRedirectClient,
  exchangeCodeForMcpAccessToken,
  registerMcpServerOAuthClient,
} from "../modules/oauth/controller";

const router = Router();

router.post(
  "/register",
  oauthRateLimiter,
  asyncHandler(registerMcpServerOAuthClient),
);
router.get(
  "/authorize",
  oauthRateLimiter,
  asyncHandler(authorizeClientAndRedirectToFathom),
);
router.get(
  "/fathom/callback",
  asyncHandler(completeFathomAuthAndRedirectClient),
);
router.post(
  "/token",
  oauthRateLimiter,
  asyncHandler(exchangeCodeForMcpAccessToken),
);

export default router;
