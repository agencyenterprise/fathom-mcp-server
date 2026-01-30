import { Router } from "express";
import { asyncHandler } from "../middleware/error";
import { oauthRateLimiter } from "../middleware/rateLimit";
import {
  getClaudeClient,
  getFathomCallback,
  postClaudeClient,
  postClaudeAccessToken,
} from "../modules/oauth/controller";

const router = Router();

router.post("/register", oauthRateLimiter, asyncHandler(postClaudeClient));
router.get("/authorize", oauthRateLimiter, asyncHandler(getClaudeClient));
router.get("/fathom/callback", asyncHandler(getFathomCallback));
router.post("/token", oauthRateLimiter, asyncHandler(postClaudeAccessToken));

export default router;
