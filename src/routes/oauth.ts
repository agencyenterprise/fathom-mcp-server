import { Router } from "express";
import { OAuthController } from "../modules/oauth";

const router = Router();

router.get("/authorize", OAuthController.handleAuthorize);
router.get("/fathom/callback", OAuthController.handleFathomCallback);
router.post("/token", OAuthController.handleTokenExchange);

export const oauthRouter = router;
