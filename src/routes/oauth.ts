import { Router } from "express";
import { asyncHandler } from "../middleware/error";
import { oauthRateLimiter } from "../middleware/rateLimit";
import {
  handleAuthorize,
  handleFathomCallback,
  handleRegister,
  handleTokenExchange,
} from "../modules/oauth/controller";

const router = Router();

router.post("/register", oauthRateLimiter, asyncHandler(handleRegister));
router.get("/authorize", oauthRateLimiter, asyncHandler(handleAuthorize));
router.get("/fathom/callback", asyncHandler(handleFathomCallback));
router.post("/token", oauthRateLimiter, asyncHandler(handleTokenExchange));

export default router;
