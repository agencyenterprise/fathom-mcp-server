import { Router } from "express";
import { asyncHandler } from "../middleware/error";
import { OAuthController } from "../modules/oauth";

const router = Router();

router.post("/register", asyncHandler(OAuthController.handleRegister));
router.get("/authorize", asyncHandler(OAuthController.handleAuthorize));
router.get(
  "/fathom/callback",
  asyncHandler(OAuthController.handleFathomCallback),
);
router.post("/token", asyncHandler(OAuthController.handleTokenExchange));

export const oauthRouter = router;
